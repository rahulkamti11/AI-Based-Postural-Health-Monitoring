"""
Camera Capture Manager
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import cv2
import os

class MultiCameraCaptureManager:
    """
    Manages multiple video captures simultaneously to support the front and side camera architecture.
    """
    def __init__(self, camera_indices: list):
        self.camera_indices = camera_indices
        self.caps = {}

    def start(self):
        for idx in self.camera_indices:
            if idx >= 0:
                # Use DirectShow on Windows for faster initialization, fallback to any otherwise
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    self.caps[idx] = cap
                else:
                    print(f"Warning: Could not open camera {idx}")

    def read_frames(self) -> dict:
        """
        Reads a frame from all active cameras.
        Returns a dictionary mapping camera_index -> frame
        """
        frames = {}
        for idx, cap in self.caps.items():
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    frames[idx] = frame
        return frames

    def release(self):
        for cap in self.caps.values():
            cap.release()
        self.caps.clear()
