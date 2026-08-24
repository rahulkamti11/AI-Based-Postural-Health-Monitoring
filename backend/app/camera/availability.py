"""
Camera Availability Detection Service
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import cv2

def detect_available_cameras(max_indices_to_check=4):
    """
    Scans camera indices 0..max_indices_to_check to find active video devices.
    Returns list of dicts: [{'camera_id': 'front'|'left'|'right', 'index': int, 'available': bool}]
    """
    available_cameras = []
    
    for idx in range(max_indices_to_check):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW if cv2.os.name == 'nt' else cv2.CAP_ANY)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                cam_label = "front" if idx == 0 else ("left" if idx == 1 else "right")
                available_cameras.append({
                    'camera_id': cam_label,
                    'device_index': idx,
                    'name': f"Camera Stream {idx} ({cam_label.capitalize()})",
                    'status': 'available',
                    'resolution': f"{int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}"
                })
            cap.release()

    if not available_cameras:
        # Fallback placeholder if no hardware camera is connected
        available_cameras.append({
            'camera_id': 'front',
            'device_index': -1,
            'name': 'Virtual / Simulated Front Camera',
            'status': 'simulated',
            'resolution': '640x480'
        })
        
    return available_cameras
