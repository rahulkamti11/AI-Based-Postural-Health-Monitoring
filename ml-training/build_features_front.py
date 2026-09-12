import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MASTER_CSV_PATH = os.path.join(BASE_DIR, 'dataset', 'master_dataset.csv')
FEATURES_FRONT_PATH = os.path.join(BASE_DIR, 'dataset', 'features', 'features_front.csv')

def calculate_euclidean_3d(x1, y1, z1, x2, y2, z2):
    return np.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)

def build_features_front():
    print(f"Loading master dataset from '{MASTER_CSV_PATH}'...")
    df = pd.read_csv(MASTER_CSV_PATH)

    # 1. Filter to front view rows
    df_front = df[df['camera_view'] == 'front'].copy()
    print(f"Filtered to front view rows: {len(df_front)} rows.")

    # 2. Key landmarks needed for front view analysis
    key_landmarks = [
        'nose', 'left_ear', 'right_ear', 
        'left_shoulder', 'right_shoulder', 
        'left_hip', 'right_hip'
    ]
    
    meta_cols = ['subject_id', 'source_dataset', 'camera_view', 'session_id', 'posture_label', 'posture_quality']
    landmark_coords = [f"{lm}_{axis}" for lm in key_landmarks for axis in ['x', 'y', 'z']]
    
    kept_cols = meta_cols + landmark_coords
    df_features = df_front[kept_cols].copy()

    # 3. Feature Calculations
    # A. shoulder_tilt_angle: angle of left_shoulder -> right_shoulder line vs horizontal axis
    dy_shoulder = df_features['right_shoulder_y'] - df_features['left_shoulder_y']
    dx_shoulder = df_features['right_shoulder_x'] - df_features['left_shoulder_x']
    df_features['shoulder_tilt_angle'] = np.degrees(np.arctan2(dy_shoulder, dx_shoulder))

    # B. shoulder_symmetry_ratio: dist(nose, left_shoulder) / dist(nose, right_shoulder)
    dist_nose_lshoulder = calculate_euclidean_3d(
        df_features['nose_x'], df_features['nose_y'], df_features['nose_z'],
        df_features['left_shoulder_x'], df_features['left_shoulder_y'], df_features['left_shoulder_z']
    )
    dist_nose_rshoulder = calculate_euclidean_3d(
        df_features['nose_x'], df_features['nose_y'], df_features['nose_z'],
        df_features['right_shoulder_x'], df_features['right_shoulder_y'], df_features['right_shoulder_z']
    )
    df_features['shoulder_symmetry_ratio'] = dist_nose_lshoulder / (dist_nose_rshoulder + 1e-8)

    # C. head_lateral_offset: x-distance between nose and shoulder midpoint
    shoulder_mid_x = (df_features['left_shoulder_x'] + df_features['right_shoulder_x']) / 2.0
    df_features['head_lateral_offset'] = df_features['nose_x'] - shoulder_mid_x

    # D. torso_lateral_lean_angle: angle between hip_mid -> shoulder_mid line and vertical axis
    shoulder_mid_y = (df_features['left_shoulder_y'] + df_features['right_shoulder_y']) / 2.0
    hip_mid_x = (df_features['left_hip_x'] + df_features['right_hip_x']) / 2.0
    hip_mid_y = (df_features['left_hip_y'] + df_features['right_hip_y']) / 2.0

    dx_torso = shoulder_mid_x - hip_mid_x
    dy_torso = shoulder_mid_y - hip_mid_y  # Note: y increases downward in MediaPipe image coordinates
    # Angle relative to vertical (upward = -y direction)
    df_features['torso_lateral_lean_angle'] = np.degrees(np.arctan2(dx_torso, -dy_torso))

    # 4. Save features_front.csv
    os.makedirs(os.path.dirname(FEATURES_FRONT_PATH), exist_ok=True)
    df_features.to_csv(FEATURES_FRONT_PATH, index=False)
    print(f"\n[OK] Front features saved to '{FEATURES_FRONT_PATH}'")

    print("\n" + "="*60)
    print("=== FRONT FEATURES GENERATION SUMMARY ===")
    print("="*60)
    print(f"Total Rows:    {len(df_features)}")
    print(f"Total Columns: {len(df_features.columns)}")
    print("\nCalculated Feature Means per Class:")
    feature_cols = ['shoulder_tilt_angle', 'shoulder_symmetry_ratio', 'head_lateral_offset', 'torso_lateral_lean_angle']
    print(df_features.groupby('posture_label')[feature_cols].mean().round(4))
    print("="*60)

if __name__ == '__main__':
    build_features_front()
