"""
MediaPipe Landmark Extractor & Real-Time Feature Calculation Module
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import cv2
import numpy as np
import mediapipe as mp

class MediaPipePoseExtractor:
    def __init__(self, min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )

    def extract_landmarks(self, frame):
        """
        Runs MediaPipe Pose on an BGR OpenCV frame.
        Returns: (landmarks_dict, results_raw) or (None, None) if pose not detected.
        """
        if frame is None:
            return None, None

        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)

        if not results.pose_landmarks:
            return None, None

        landmarks = {}
        for idx, landmark in enumerate(results.pose_landmarks.landmark):
            lm_name = self.mp_pose.PoseLandmark(idx).name.lower()
            landmarks[lm_name] = {
                'x': float(landmark.x),
                'y': float(landmark.y),
                'z': float(landmark.z),
                'visibility': float(landmark.visibility)
            }

        return landmarks, results

    def compute_front_features(self, landmarks):
        """
        Computes the 4 key front geometric features from extracted landmarks dictionary.
        Returns dict with calculated feature values.
        """
        if not landmarks or 'nose' not in landmarks or 'left_shoulder' not in landmarks or 'right_shoulder' not in landmarks:
            return None

        nose_x, nose_y, nose_z = landmarks['nose']['x'], landmarks['nose']['y'], landmarks['nose']['z']
        l_sh_x, l_sh_y, l_sh_z = landmarks['left_shoulder']['x'], landmarks['left_shoulder']['y'], landmarks['left_shoulder']['z']
        r_sh_x, r_sh_y, r_sh_z = landmarks['right_shoulder']['x'], landmarks['right_shoulder']['y'], landmarks['right_shoulder']['z']

        l_hip_x, l_hip_y = landmarks.get('left_hip', {}).get('x', l_sh_x), landmarks.get('left_hip', {}).get('y', l_sh_y + 0.3)
        r_hip_x, r_hip_y = landmarks.get('right_hip', {}).get('x', r_sh_x), landmarks.get('right_hip', {}).get('y', r_sh_y + 0.3)

        # 1. shoulder_tilt_angle
        dy_sh = r_sh_y - l_sh_y
        dx_sh = r_sh_x - l_sh_x
        shoulder_tilt_angle = float(np.degrees(np.arctan2(dy_sh, dx_sh)))

        # 2. shoulder_symmetry_ratio
        dist_nose_lsh = float(np.sqrt((l_sh_x - nose_x)**2 + (l_sh_y - nose_y)**2 + (l_sh_z - nose_z)**2))
        dist_nose_rsh = float(np.sqrt((r_sh_x - nose_x)**2 + (r_sh_y - nose_y)**2 + (r_sh_z - nose_z)**2))
        shoulder_symmetry_ratio = dist_nose_lsh / (dist_nose_rsh + 1e-8)

        # 3. head_lateral_offset
        sh_mid_x = (l_sh_x + r_sh_x) / 2.0
        head_lateral_offset = float(nose_x - sh_mid_x)

        # 4. torso_lateral_lean_angle
        sh_mid_y = (l_sh_y + r_sh_y) / 2.0
        hip_mid_x = (l_hip_x + r_hip_x) / 2.0
        hip_mid_y = (l_hip_y + r_hip_y) / 2.0

        dx_torso = sh_mid_x - hip_mid_x
        dy_torso = sh_mid_y - hip_mid_y  # y increases downward in image
        torso_lateral_lean_angle = float(np.degrees(np.arctan2(dx_torso, -dy_torso)))

        return {
            'shoulder_tilt_angle': round(shoulder_tilt_angle, 2),
            'shoulder_symmetry_ratio': round(shoulder_symmetry_ratio, 4),
            'head_lateral_offset': round(head_lateral_offset, 4),
            'torso_lateral_lean_angle': round(torso_lateral_lean_angle, 2)
        }

    def close(self):
        if self.pose:
            self.pose.close()
