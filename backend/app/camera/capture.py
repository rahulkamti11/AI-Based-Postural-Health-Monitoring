"""
Camera Capture Manager
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import cv2

class CameraCaptureManager:
    def __init__(self, device_index=0):
        self.device_index = device_index
        self.cap = None

    def start(self):
        if self.device_index >= 0:
            self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW if cv2.os.name == 'nt' else cv2.CAP_ANY)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    def read_frame(self):
        if self.cap is not None and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

    def release(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None
