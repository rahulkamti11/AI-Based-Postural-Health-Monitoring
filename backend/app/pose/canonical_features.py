"""
Canonical Posture Feature Calculation Module
AI-Based Sitting Posture Detection and Postural Health Monitoring System

This module serves as the SINGLE SOURCE OF TRUTH for geometric feature engineering,
used identically by:
  1. Offline dataset feature extraction (ml-training/build_features.py)
  2. Live real-time inference (backend/app/pose/mediapipe_extractor.py & app/main.py)
"""

import math
from typing import Dict, Any, Optional

EPS = 1e-7
VISIBILITY_THRESHOLD = 0.5

CANONICAL_FRONT_FEATURES = [
    'shoulder_tilt_abs',
    'shoulder_symmetry_deviation',
    'head_lateral_offset_norm',
    'torso_lean_abs'
]

CANONICAL_SIDE_FEATURES = [
    'neck_angle_abs',
    'torso_lean_abs',
    'head_forward_norm',
    'spine_deviation_angle'
]

REQUIRED_FRONT_LANDMARKS = [
    'nose',
    'left_shoulder',
    'right_shoulder',
    'left_hip',
    'right_hip'
]

REQUIRED_SIDE_LANDMARKS = {
    'left': ['left_ear', 'left_shoulder', 'left_hip'],
    'right': ['right_ear', 'right_shoulder', 'right_hip']
}


def distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Euclidean distance in normalized 2D image coordinates."""
    return math.hypot(x2 - x1, y2 - y1)


def angle_vertical(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Signed angle from vertical (0 degrees = pointing straight up).
    In image coordinates, x increases to the right, y increases downward.
    Vector from (x1, y1) to (x2, y2) has:
      dx = x2 - x1
      -dy = -(y2 - y1) = y1 - y2 (upwards component)
    """
    dx = x2 - x1
    dy_up = -(y2 - y1)
    if abs(dx) < EPS and abs(dy_up) < EPS:
        return 0.0
    return math.degrees(math.atan2(dx, dy_up))


def angle_between_vectors(v1x: float, v1y: float, v2x: float, v2y: float) -> float:
    """
    Angle in degrees between two 2D vectors (0 to 180 degrees).
    """
    m1 = math.hypot(v1x, v1y)
    m2 = math.hypot(v2x, v2y)
    if m1 < EPS or m2 < EPS:
        return 0.0
    cos_theta = (v1x * v2x + v1y * v2y) / (m1 * m2)
    cos_theta = max(-1.0, min(1.0, cos_theta))
    return math.degrees(math.acos(cos_theta))


def safe_ratio(num: float, den: float) -> float:
    """Safe division avoiding division by zero or NaN."""
    if abs(den) < EPS:
        return 0.0
    return num / den


def is_valid_landmark(lm: Any, min_vis: float = VISIBILITY_THRESHOLD) -> bool:
    """Validates that a landmark object contains valid x, y and sufficient visibility."""
    if not lm or not isinstance(lm, dict):
        return False
    if 'x' not in lm or 'y' not in lm:
        return False
    x, y = lm['x'], lm['y']
    if math.isnan(x) or math.isnan(y):
        return False
    vis = lm.get('visibility', lm.get('v', 1.0))
    if vis is not None and not math.isnan(vis) and vis < min_vis:
        return False
    return True


def compute_canonical_front_features(landmarks: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """
    Computes the 4 canonical front geometric features from a landmarks dictionary.
    Returns None if any required landmark is missing or low-visibility.
    DOES NOT FABRICATE HIPS.
    """
    if not landmarks:
        return None

    for name in REQUIRED_FRONT_LANDMARKS:
        if not is_valid_landmark(landmarks.get(name)):
            return None

    try:
        lsx, lsy = landmarks['left_shoulder']['x'], landmarks['left_shoulder']['y']
        rsx, rsy = landmarks['right_shoulder']['x'], landmarks['right_shoulder']['y']
        lhx, lhy = landmarks['left_hip']['x'], landmarks['left_hip']['y']
        rhx, rhy = landmarks['right_hip']['x'], landmarks['right_hip']['y']
        nx, ny = landmarks['nose']['x'], landmarks['nose']['y']

        # 1. Anatomical Reference Scales
        shoulder_width = distance(lsx, lsy, rsx, rsy)
        if shoulder_width < EPS:
            return None

        msx, msy = (lsx + rsx) / 2.0, (lsy + rsy) / 2.0
        mhx, mhy = (lhx + rhx) / 2.0, (lhy + rhy) / 2.0
        torso_length = distance(mhx, mhy, msx, msy)
        if torso_length < EPS:
            return None

        # 2. Feature 1: Shoulder Tilt Absolute (Deviation from horizontal in degrees)
        # Vector from right shoulder to left shoulder (pointing across the chest)
        # With subject facing camera, left shoulder is at viewer's right (lsx > rsx, dx > 0)
        dx_sh = lsx - rsx
        dy_sh = lsy - rsy
        tilt_angle = math.degrees(math.atan2(dy_sh, dx_sh))
        shoulder_tilt_abs = round(abs(tilt_angle), 4)

        # 3. Feature 2: Shoulder Symmetry Deviation
        # Difference in distance from nose to each shoulder, normalized by shoulder width
        dist_l = distance(nx, ny, lsx, lsy)
        dist_r = distance(nx, ny, rsx, rsy)
        sym_diff = safe_ratio(dist_l - dist_r, shoulder_width)
        shoulder_symmetry_deviation = round(abs(sym_diff), 5)

        # 4. Feature 3: Head Lateral Offset Normalized
        # Horizontal deviation of nose from shoulder midpoint, normalized by shoulder width
        head_lat = nx - msx
        head_lateral_offset_norm = round(abs(safe_ratio(head_lat, shoulder_width)), 5)

        # 5. Feature 4: Torso Lean Absolute (Deviation of trunk from vertical in degrees)
        lean_angle = angle_vertical(mhx, mhy, msx, msy)
        torso_lean_abs = round(abs(lean_angle), 4)

        return {
            'shoulder_tilt_abs': shoulder_tilt_abs,
            'shoulder_symmetry_deviation': shoulder_symmetry_deviation,
            'head_lateral_offset_norm': head_lateral_offset_norm,
            'torso_lean_abs': torso_lean_abs
        }
    except Exception as e:
        print(f"[Canonical Features] Front calculation error: {e}")
        return None


def compute_canonical_side_features(landmarks: Dict[str, Any], view: str = 'left') -> Optional[Dict[str, float]]:
    """
    Computes the 4 canonical side geometric features from a landmarks dictionary.
    Handles left vs right side view camera orientation automatically.
    Returns None if any required landmark is missing or low-visibility.
    DOES NOT FABRICATE HIPS.
    """
    if not landmarks:
        return None

    view = view.lower()
    if view not in ('left', 'right'):
        view = 'left'

    prefix = f"{view}_"
    req_keys = REQUIRED_SIDE_LANDMARKS[view]
    for key in req_keys:
        if not is_valid_landmark(landmarks.get(key)):
            return None

    try:
        ear_x, ear_y = landmarks[f"{prefix}ear"]['x'], landmarks[f"{prefix}ear"]['y']
        sh_x, sh_y = landmarks[f"{prefix}shoulder"]['x'], landmarks[f"{prefix}shoulder"]['y']
        hip_x, hip_y = landmarks[f"{prefix}hip"]['x'], landmarks[f"{prefix}hip"]['y']

        torso_length = distance(sh_x, sh_y, hip_x, hip_y)
        if torso_length < EPS:
            return None

        # Orientation sign: In left camera, user faces left of frame (ear_x < sh_x) -> s = -1.0
        # In right camera, user faces right of frame (ear_x > sh_x) -> s = +1.0
        # This aligns "forward" as positive across both cameras
        s = -1.0 if view == 'left' else 1.0

        # 1. Feature 1: Neck Angle Absolute (Deviation from vertical)
        neck_angle = s * angle_vertical(sh_x, sh_y, ear_x, ear_y)
        neck_angle_abs = round(abs(neck_angle), 4)

        # 2. Feature 2: Torso Lean Absolute (Deviation from vertical)
        torso_lean = s * angle_vertical(hip_x, hip_y, sh_x, sh_y)
        torso_lean_abs = round(abs(torso_lean), 4)

        # 3. Feature 3: Head Forward Normalized (by torso length)
        head_fwd = s * (ear_x - sh_x)
        head_forward_norm = round(safe_ratio(head_fwd, torso_length), 5)

        # 4. Feature 4: Spine Deviation Angle (Angle between torso vector and neck vector)
        # Vector 1: Hip -> Shoulder (pointing up along torso)
        v1_x, v1_y = sh_x - hip_x, sh_y - hip_y
        # Vector 2: Shoulder -> Ear (pointing up along cervical spine)
        v2_x, v2_y = ear_x - sh_x, ear_y - sh_y
        spine_dev = angle_between_vectors(v1_x, v1_y, v2_x, v2_y)
        spine_deviation_angle = round(spine_dev, 4)

        return {
            'neck_angle_abs': neck_angle_abs,
            'torso_lean_abs': torso_lean_abs,
            'head_forward_norm': head_forward_norm,
            'spine_deviation_angle': spine_deviation_angle
        }
    except Exception as e:
        print(f"[Canonical Features] Side calculation error: {e}")
        return None


def row_to_landmarks_front(row: Any) -> Dict[str, Dict[str, float]]:
    """Converts a DataFrame row from master_dataset.csv into the front landmarks dict."""
    return {
        'nose': {'x': float(row['nose_x']), 'y': float(row['nose_y']), 'visibility': float(row.get('nose_v', 1.0))},
        'left_shoulder': {'x': float(row['left_shoulder_x']), 'y': float(row['left_shoulder_y']), 'visibility': float(row.get('left_shoulder_v', 1.0))},
        'right_shoulder': {'x': float(row['right_shoulder_x']), 'y': float(row['right_shoulder_y']), 'visibility': float(row.get('right_shoulder_v', 1.0))},
        'left_hip': {'x': float(row['left_hip_x']), 'y': float(row['left_hip_y']), 'visibility': float(row.get('left_hip_v', 1.0))},
        'right_hip': {'x': float(row['right_hip_x']), 'y': float(row['right_hip_y']), 'visibility': float(row.get('right_hip_v', 1.0))}
    }


def row_to_landmarks_side(row: Any, view: str) -> Dict[str, Dict[str, float]]:
    """Converts a DataFrame row from master_dataset.csv into the side landmarks dict."""
    p = f"{view}_"
    return {
        f"{p}ear": {'x': float(row[f"{p}ear_x"]), 'y': float(row[f"{p}ear_y"]), 'visibility': float(row.get(f"{p}ear_v", 1.0))},
        f"{p}shoulder": {'x': float(row[f"{p}shoulder_x"]), 'y': float(row[f"{p}shoulder_y"]), 'visibility': float(row.get(f"{p}shoulder_v", 1.0))},
        f"{p}hip": {'x': float(row[f"{p}hip_x"]), 'y': float(row[f"{p}hip_y"]), 'visibility': float(row.get(f"{p}hip_v", 1.0))}
    }
