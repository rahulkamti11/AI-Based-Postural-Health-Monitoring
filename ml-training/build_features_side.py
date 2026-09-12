"""
Build Side Camera Derived Feature CSVs (features_left.csv and features_right.csv)
Extracts clinical and proxy geometric angles from master_dataset.csv:
1. craniovertebral_angle (CVA - ear to shoulder vs horizontal)
2. trunk_flexion_angle (ear -> shoulder -> hip surface proxy)
3. torso_recline_angle (shoulder -> hip vs vertical line)
"""

import os
import numpy as np
import pandas as pd

MASTER_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "master_dataset.csv"))
FEATURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "features"))

def compute_side_features_for_row(row, side="left"):
    ear_x, ear_y = row[f"{side}_ear_x"], row[f"{side}_ear_y"]
    sh_x, sh_y = row[f"{side}_shoulder_x"], row[f"{side}_shoulder_y"]
    hip_x, hip_y = row[f"{side}_hip_x"], row[f"{side}_hip_y"]
    
    # 1. CVA (Craniovertebral Angle)
    # Measured against horizontal plane passing through shoulder
    dx = ear_x - sh_x
    dy = sh_y - ear_y  # image y is inverted (top=0)
    
    if side == "left":
        # Facing left means ear is to the left of shoulder (dx < 0)
        cva = np.degrees(np.arctan2(dy, -dx)) if dx < 0 else np.degrees(np.arctan2(dy, dx))
    else:
        # Facing right means ear is to the right of shoulder (dx > 0)
        cva = np.degrees(np.arctan2(dy, dx)) if dx > 0 else np.degrees(np.arctan2(dy, -dx))
        
    # 2. Trunk Flexion Angle (Angle at shoulder between ear->shoulder and shoulder->hip)
    v_ear = np.array([ear_x - sh_x, ear_y - sh_y])
    v_hip = np.array([hip_x - sh_x, hip_y - sh_y])
    norm_ear = np.linalg.norm(v_ear)
    norm_hip = np.linalg.norm(v_hip)
    
    if norm_ear > 0 and norm_hip > 0:
        cos_flex = np.dot(v_ear, v_hip) / (norm_ear * norm_hip)
        flexion = np.degrees(np.arccos(np.clip(cos_flex, -1.0, 1.0)))
    else:
        flexion = np.nan
        
    # 3. Torso Recline Angle (Angle between shoulder->hip vector and vertical downward line)
    v_vert = np.array([0.0, 1.0])
    if norm_hip > 0:
        cos_recline = np.dot(v_hip, v_vert) / norm_hip
        recline = np.degrees(np.arccos(np.clip(cos_recline, -1.0, 1.0)))
    else:
        recline = np.nan
        
    return {
        "craniovertebral_angle": round(cva, 2),
        "trunk_flexion_angle": round(flexion, 2),
        "torso_recline_angle": round(recline, 2)
    }

def build_side_features():
    if not os.path.exists(MASTER_CSV):
        print(f"Master dataset not found at: {MASTER_CSV}")
        return
        
    df = pd.read_csv(MASTER_CSV)
    os.makedirs(FEATURES_DIR, exist_ok=True)
    
    for side in ["left", "right"]:
        df_side = df[df["camera_view"] == side].copy()
        if len(df_side) == 0:
            print(f"No records found for camera_view == '{side}' in master dataset.")
            continue
            
        features_list = []
        for _, row in df_side.iterrows():
            feat = compute_side_features_for_row(row, side=side)
            record = {
                "subject_id": row["subject_id"],
                "session_id": row["session_id"],
                "posture_label": row["posture_label"],
                "posture_quality": row["posture_quality"]
            }
            record.update(feat)
            features_list.append(record)
            
        df_out = pd.DataFrame(features_list)
        out_path = os.path.join(FEATURES_DIR, f"features_{side}.csv")
        df_out.to_csv(out_path, index=False)
        print(f"Saved {len(df_out)} derived records to: {out_path}")
        print(df_out.head())

if __name__ == "__main__":
    build_side_features()
