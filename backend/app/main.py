"""
FastAPI Server Entrypoint & WebSocket Live Stream Service
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import time
import asyncio
import sys
import os
import json
import math
import random

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.camera.availability import detect_available_cameras
from app.pose.mediapipe_extractor import MediaPipePoseExtractor
from app.inference.binary_logic import MockBinaryClassifier

app = FastAPI(
    title="AI Sitting Posture Detection API",
    description="Real-time multi-camera binary posture analysis WebSocket service.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mock_classifier = MockBinaryClassifier()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Sitting Posture Detection System API (Binary)",
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
    latest_live_features = None
    last_keypoint_time = time.time()
    step_counter = 0

    async def receive_client_keypoints():
        nonlocal latest_live_features, last_keypoint_time
        try:
            while True:
                data_text = await websocket.receive_text()
                data = json.loads(data_text)
                if data.get('type') == 'landmarks' and 'landmarks' in data:
                    landmarks = data['landmarks']
                    features = pose_extractor.compute_front_features(landmarks)
                    if features:
                        latest_live_features = features
                        last_keypoint_time = time.time()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"Client listener exception: {e}")

    # Run client listener task concurrently
    listen_task = asyncio.create_task(receive_client_keypoints())

    try:
        while True:
            t0 = time.time()
            now = time.time()

            active_cameras = ["front"]

            # Check if we have active genuine keypoints from browser video feed within 1.5 seconds
            if latest_live_features is not None and (now - last_keypoint_time < 1.5):
                result = mock_classifier.evaluate_posture(active_cameras, latest_live_features)
                result['timestamp'] = round(time.time(), 3)
                await websocket.send_json(result)
            else:
                # Dynamic demo stream fallback when video feed is offline/paused
                step_counter += 1
                sim_torso_lean = round(2.5 * math.sin(step_counter * 0.2) + random.uniform(-0.5, 0.5), 2)
                sim_shoulder_tilt = round(-170.0 + 1.2 * math.cos(step_counter * 0.15), 2)
                
                sim_features = {
                    'shoulder_tilt_angle': sim_shoulder_tilt,
                    'shoulder_symmetry_ratio': round(1.0 + 0.01 * math.sin(step_counter * 0.1), 4),
                    'head_lateral_offset': round(0.005 * math.cos(step_counter * 0.2), 4),
                    'torso_lateral_lean_angle': sim_torso_lean
                }

                result = mock_classifier.evaluate_posture(active_cameras, sim_features)
                result['timestamp'] = round(time.time(), 3)
                await websocket.send_json(result)

            elapsed = time.time() - t0
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
