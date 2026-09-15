"""
MediaPipe Landmark Extractor & Real-Time Feature Calculation Module
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import math

def distance(x1, y1, x2, y2):
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

def calculate_angle_vertical(x1, y1, x2, y2):
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    if dy == 0: return 90.0
    return math.degrees(math.atan2(dx, dy))

class MediaPipePoseExtractor:
    def __init__(self):
        # We don't need the actual mediapipe engine here anymore because the frontend 
        # is doing the extraction and just sending us the landmarks dictionary via WebSocket!
        pass

    def compute_front_features(self, landmarks):
        """
        Computes the 4 key front geometric features from extracted landmarks dictionary.
        Must mathematically perfectly match the ML dataset generation (build_features.py).
        """
        if not landmarks or 'nose' not in landmarks or 'left_shoulder' not in landmarks or 'right_shoulder' not in landmarks:
            return None
            
        try:
            row = {
                'nose_x': landmarks['nose']['x'],
                'nose_y': landmarks['nose']['y'],
                'left_shoulder_x': landmarks['left_shoulder']['x'],
                'left_shoulder_y': landmarks['left_shoulder']['y'],
                'right_shoulder_x': landmarks['right_shoulder']['x'],
                'right_shoulder_y': landmarks['right_shoulder']['y'],
                'left_hip_x': landmarks.get('left_hip', {}).get('x', landmarks['left_shoulder']['x']),
                'left_hip_y': landmarks.get('left_hip', {}).get('y', landmarks['left_shoulder']['y'] + 0.3),
                'right_hip_x': landmarks.get('right_hip', {}).get('x', landmarks['right_shoulder']['x']),
                'right_hip_y': landmarks.get('right_hip', {}).get('y', landmarks['right_shoulder']['y'] + 0.3),
            }

            # 1. Shoulder Tilt Angle
            dy_sh = abs(row['right_shoulder_y'] - row['left_shoulder_y'])
            dx_sh = abs(row['right_shoulder_x'] - row['left_shoulder_x'])
            tilt_angle = math.degrees(math.atan2(dy_sh, dx_sh)) if dx_sh != 0 else 90.0
            
            # 2. Shoulder Symmetry Ratio
            dist_l = distance(row['nose_x'], row['nose_y'], row['left_shoulder_x'], row['left_shoulder_y'])
            dist_r = distance(row['nose_x'], row['nose_y'], row['right_shoulder_x'], row['right_shoulder_y'])
            sym_ratio = dist_l / dist_r if dist_r != 0 else 1.0
            
            # 3. Head Lateral Offset
            mid_shoulder_x = (row['left_shoulder_x'] + row['right_shoulder_x']) / 2.0
            head_offset = row['nose_x'] - mid_shoulder_x
            
            # 4. Torso Lateral Lean Angle
            mid_hip_x = (row['left_hip_x'] + row['right_hip_x']) / 2.0
            mid_hip_y = (row['left_hip_y'] + row['right_hip_y']) / 2.0
            mid_shoulder_y = (row['left_shoulder_y'] + row['right_shoulder_y']) / 2.0
            torso_lean = calculate_angle_vertical(mid_hip_x, mid_hip_y, mid_shoulder_x, mid_shoulder_y)

            return {
                'shoulder_tilt_angle': round(tilt_angle, 4),
                'shoulder_symmetry_ratio': round(sym_ratio, 4),
                'head_lateral_offset': round(head_offset, 4),
                'torso_lateral_lean_angle': round(torso_lean, 4)
            }
        except Exception as e:
            print(f"[Backend Error] Front Feature Calc Error: {e}")
            return None

    def compute_side_features(self, landmarks, view='left'):
        """
        Computes the 4 key side geometric features from extracted landmarks dictionary.
        Dynamically handles left or right side based on `view`.
        """
        prefix = 'left_' if view == 'left' else 'right_'
        
        if not landmarks or f'{prefix}ear' not in landmarks or f'{prefix}shoulder' not in landmarks:
            return None
            
        try:
            ear_x = landmarks[f'{prefix}ear']['x']
            ear_y = landmarks[f'{prefix}ear']['y']
            sh_x = landmarks[f'{prefix}shoulder']['x']
            sh_y = landmarks[f'{prefix}shoulder']['y']
            
            # Use hip if available, else simulate straight down
            if f'{prefix}hip' in landmarks:
                hip_x = landmarks[f'{prefix}hip']['x']
                hip_y = landmarks[f'{prefix}hip']['y']
            else:
                hip_x = sh_x
                hip_y = sh_y + 0.3

            # 1. Neck Angle (Vertical)
            neck_angle = calculate_angle_vertical(sh_x, sh_y, ear_x, ear_y)
            
            # 2. Torso Lean Angle (Vertical)
            torso_lean = calculate_angle_vertical(hip_x, hip_y, sh_x, sh_y)
            
            # 3. Head Forward Distance (normalized by torso length)
            torso_len = distance(sh_x, sh_y, hip_x, hip_y)
            head_fwd_dist = abs(ear_x - sh_x) / torso_len if torso_len != 0 else 0
            
            # 4. Spine Curve Angle
            v1_x, v1_y = sh_x - hip_x, sh_y - hip_y
            v2_x, v2_y = ear_x - sh_x, ear_y - sh_y
            dot_prod = (v1_x * v2_x) + (v1_y * v2_y)
            mag1 = math.sqrt(v1_x**2 + v1_y**2)
            mag2 = math.sqrt(v2_x**2 + v2_y**2)
            if mag1 * mag2 == 0:
                spine_curve = 180.0
            else:
                cos_val = max(min(dot_prod / (mag1 * mag2), 1.0), -1.0)
                spine_curve = 180.0 - math.degrees(math.acos(cos_val))

            return {
                'neck_angle': round(neck_angle, 4),
                'torso_lean_angle': round(torso_lean, 4),
                'head_forward_dist': round(head_fwd_dist, 4),
                'spine_curve_angle': round(spine_curve, 4)
            }
        except Exception as e:
            print(f"[Backend Error] Side Feature Calc Error: {e}")
            return None

    def close(self):
        pass
