"""
FastAPI Server Entrypoint & WebSocket Live Stream Service
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import time
import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.camera.availability import detect_available_cameras
from app.camera.capture import CameraCaptureManager
from app.pose.mediapipe_extractor import MediaPipePoseExtractor
from app.inference.fusion_logic import process_front_camera_inference, fuse_camera_predictions

app = FastAPI(
    title="AI Sitting Posture Detection API",
    description="Real-time multi-camera posture analysis WebSocket service for IEEE minor project.",
    version="1.0.0"
)

# CORS Setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HEALTH_MESSAGES = {
    'neutral_spinal_alignment': "Balanced spine alignment; minimal muscular strain.",
    'cervical_forward_head_posture': "Prolonged forward head posture strains neck muscles and is associated with increased neck pain severity.",
    'thoracic_kyphotic_slouch': "Sustained slouching increases intervertebral disc pressure, risking disc bulges/herniation over time.",
    'lateral_trunk_tilt_left': "Asymmetric loading strains shoulder and neck muscles unevenly.",
    'lateral_trunk_tilt_right': "Asymmetric loading strains shoulder and neck muscles unevenly.",
    'posterior_trunk_recline': "Excessive reclining without lumbar support reduces natural spinal curve support, associated with low back pain risk."
}

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

    # Detect hardware cameras
    detected_cams = detect_available_cameras()
    front_cam_info = next((c for c in detected_cams if c['status'] == 'available'), None)
    device_idx = front_cam_info['device_index'] if front_cam_info else -1

    camera_manager = CameraCaptureManager(device_index=device_idx)
    pose_extractor = MediaPipePoseExtractor()

    if device_idx >= 0:
        camera_manager.start()

    try:
        while True:
            t0 = time.time()
            frame = camera_manager.read_frame()

            if frame is not None:
                landmarks, _ = pose_extractor.extract_landmarks(frame)
                if landmarks:
                    features = pose_extractor.compute_front_features(landmarks)
                    if features:
                        front_pred = process_front_camera_inference(features)
                        active_preds = {'front': front_pred}
                        fused_result = fuse_camera_predictions(active_preds)
                        fused_result['features'] = features
                        fused_result['health_message'] = HEALTH_MESSAGES.get(fused_result['posture_label'], "")
                        fused_result['timestamp'] = round(time.time(), 3)

                        await websocket.send_json(fused_result)
                    else:
                        await websocket.send_json({"status": "no_body_features_detected", "timestamp": round(time.time(), 3)})
                else:
                    await websocket.send_json({"status": "no_pose_detected", "timestamp": round(time.time(), 3)})
            else:
                # Simulated response if camera is busy or unavailable
                simulated_result = {
                    'posture_label': 'neutral_spinal_alignment',
                    'posture_quality': 'good',
                    'analysis_mode': 'Simulated Demo Stream',
                    'contributing_cameras': ['simulated_front'],
                    'confidence': 0.95,
                    'decided_by': 'simulation',
                    'rule_triggered': None,
                    'features': {
                        'shoulder_tilt_angle': -170.2,
                        'shoulder_symmetry_ratio': 1.01,
                        'head_lateral_offset': 0.005,
                        'torso_lateral_lean_angle': 2.1
                    },
                    'health_message': HEALTH_MESSAGES['neutral_spinal_alignment'],
                    'timestamp': round(time.time(), 3)
                }
                await websocket.send_json(simulated_result)

            # Control streaming speed to ~5 FPS (200ms per payload)
            elapsed = time.time() - t0
            await asyncio.sleep(max(0.01, 0.20 - elapsed))

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        camera_manager.release()
        pose_extractor.close()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
