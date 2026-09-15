import os
import pandas as pd
import numpy as np
import math

MASTER_CSV = os.path.join("dataset", "master_dataset.csv")
FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")

def distance(x1, y1, x2, y2):
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

def calculate_angle_vertical(x1, y1, x2, y2):
    # Angle from vertical (0 is straight up/down)
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    if dy == 0: return 90.0
    return math.degrees(math.atan2(dx, dy))

def process_features():
    if not os.path.exists(MASTER_CSV):
        print("Master dataset not found!")
        return

    df = pd.read_csv(MASTER_CSV)
    
    front_records = []
    side_records = []

    for _, row in df.iterrows():
        view = row['camera_view'].lower()
        
        # Base metadata
        meta = {
            'filename': row['filename'],
            'subject_id': row['subject_id'],
            'camera_view': row['camera_view'],
            'posture_label': row['posture_label'],
            'posture_quality': row['posture_quality']
        }
        
        if view == 'front':
            # Compute Front Features
            try:
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

                record = meta.copy()
                record.update({
                    'shoulder_tilt_angle': round(tilt_angle, 4),
                    'shoulder_symmetry_ratio': round(sym_ratio, 4),
                    'head_lateral_offset': round(head_offset, 4),
                    'torso_lateral_lean_angle': round(torso_lean, 4)
                })
                front_records.append(record)
            except Exception as e:
                print(f"Error calculating front features for {row['filename']}: {e}")
                
        elif view in ['left', 'right']:
            # Compute Side Features (Combine Left and Right logic)
            try:
                prefix = view + "_"
                ear_x, ear_y = row[f'{prefix}ear_x'], row[f'{prefix}ear_y']
                sh_x, sh_y = row[f'{prefix}shoulder_x'], row[f'{prefix}shoulder_y']
                hip_x, hip_y = row[f'{prefix}hip_x'], row[f'{prefix}hip_y']

                # 1. Neck Angle (Vertical)
                neck_angle = calculate_angle_vertical(sh_x, sh_y, ear_x, ear_y)
                
                # 2. Torso Lean Angle (Vertical)
                torso_lean = calculate_angle_vertical(hip_x, hip_y, sh_x, sh_y)
                
                # 3. Head Forward Distance (normalized by torso length)
                torso_len = distance(sh_x, sh_y, hip_x, hip_y)
                head_fwd_dist = abs(ear_x - sh_x) / torso_len if torso_len != 0 else 0
                
                # 4. Spine Curve Angle
                # Angle between vector(hip->shoulder) and vector(shoulder->ear)
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

                record = meta.copy()
                record.update({
                    'neck_angle': round(neck_angle, 4),
                    'torso_lean_angle': round(torso_lean, 4),
                    'head_forward_dist': round(head_fwd_dist, 4),
                    'spine_curve_angle': round(spine_curve, 4)
                })
                side_records.append(record)
            except Exception as e:
                print(f"Error calculating side features for {row['filename']}: {e}")

    # Save to CSV
    pd.DataFrame(front_records).to_csv(FRONT_CSV, index=False)
    print(f"Saved {len(front_records)} front-view records to {FRONT_CSV}")
    
    pd.DataFrame(side_records).to_csv(SIDE_CSV, index=False)
    print(f"Saved {len(side_records)} side-view records to {SIDE_CSV}")

if __name__ == "__main__":
    process_features()
