"""
FastAPI Server Entrypoint & WebSocket Live Stream Service
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import time
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.camera.availability import detect_available_cameras
from app.pose.mediapipe_extractor import MediaPipePoseExtractor
from app.inference.binary_logic import PostureModelInference

app = FastAPI(
    title="AI Sitting Posture Detection API",
    description="Real-time multi-camera posture analysis WebSocket service.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inference_engine = PostureModelInference()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Sitting Posture Detection System API",
        "version": "1.0.0"
    }

@app.get("/camera-status")
def get_camera_status():
    cameras = detect_available_cameras()
    return {
        "active_count": len([c for c in cameras if c['status'] == 'available']),
        "cameras": cameras
    }

@app.websocket("/ws/posture")
async def websocket_posture_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected to /ws/posture")

    pose_extractor = MediaPipePoseExtractor()
    
    # Store the latest raw landmarks per camera
    latest_landmarks = {
        "front": None,
        "left": None,
        "right": None
    }
    
    # Store timestamp of last update per camera
    last_update_time = {
        "front": 0,
        "left": 0,
        "right": 0
    }

    async def receive_client_keypoints():
        try:
            while True:
                data_text = await websocket.receive_text()
                data = json.loads(data_text)
                if data.get('type') == 'landmarks' and 'landmarks' in data and 'camera_id' in data:
                    cam_id = data['camera_id']
                    if cam_id in latest_landmarks:
                        latest_landmarks[cam_id] = data['landmarks']
                        last_update_time[cam_id] = time.time()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"Client listener exception: {e}")

    listen_task = asyncio.create_task(receive_client_keypoints())

    try:
        while True:
            t0 = time.time()
            now = time.time()

            active_cameras = []
            features_payload = {}

            # Process front camera
            if latest_landmarks["front"] and (now - last_update_time["front"] < 1.5):
                active_cameras.append("front")
                feats = pose_extractor.compute_front_features(latest_landmarks["front"])
                if feats: features_payload["front"] = feats

            # Process left camera
            if latest_landmarks["left"] and (now - last_update_time["left"] < 1.5):
                active_cameras.append("left")
                feats = pose_extractor.compute_side_features(latest_landmarks["left"], view="left")
                if feats: features_payload["left"] = feats
                
            # Process right camera
            if latest_landmarks["right"] and (now - last_update_time["right"] < 1.5):
                active_cameras.append("right")
                feats = pose_extractor.compute_side_features(latest_landmarks["right"], view="right")
                if feats: features_payload["right"] = feats

            if active_cameras:
                result = inference_engine.evaluate_posture(active_cameras, features_payload)
                result['timestamp'] = round(time.time(), 3)
                await websocket.send_json(result)
            else:
                # No active cameras, send offline heartbeat
                await websocket.send_json({
                    "timestamp": round(time.time(), 3),
                    "overall_quality": "good",
                    "posture_label": "offline",
                    "feedback": {"message": "Waiting for camera streams...", "alert_level": "INFO"}
                })

            elapsed = time.time() - t0
            # Broadcast at ~6-7 FPS to save bandwidth (enough for posture tracking)
            await asyncio.sleep(max(0.01, 0.15 - elapsed))

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        listen_task.cancel()
        pose_extractor.close()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
