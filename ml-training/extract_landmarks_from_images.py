"""
Extract 33 MediaPipe 3D Pose Landmarks from Dataset Raw Images.
Recursively scans dataset/raw_images/{front,left,right}/{posture_label}/*.jpg,
computes normalized (x, y, z) landmarks, and appends to dataset/master_dataset.csv.
"""

import os
import re
import cv2
import numpy as np
import pandas as pd
import mediapipe as mp

RAW_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "raw_images"))
MASTER_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "master_dataset.csv"))

# The 33 MediaPipe landmark names in exact order
LANDMARK_NAMES = [
    "nose",
    "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear",
    "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_pinky", "right_pinky",
    "left_index", "right_index",
    "left_thumb", "right_thumb",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
]

def parse_image_filename(filename):
    """
    Parses {subject_id}_{camera_view}_{posture_label}_{session_id}_{frame_idx}.jpg
    """
    base = os.path.splitext(filename)[0]
    parts = base.split("_")
    
    # Standard format: synth01_front_neutral_spinal_alignment_s01_001
    subject_id = parts[0]
    camera_view = parts[1]
    frame_idx = parts[-1]
    session_id = parts[-2]
    posture_label = "_".join(parts[2:-2])
    
    posture_quality = "good" if posture_label == "neutral_spinal_alignment" else "bad"
    
    return {
        "subject_id": subject_id,
        "source_dataset": "synthetic_multiview",
        "camera_view": camera_view,
        "session_id": session_id,
        "posture_label": posture_label,
        "posture_quality": posture_quality,
        "frame_idx": frame_idx
    }

def extract_landmarks_from_image(image_path, pose_detector):
    img = cv2.imread(image_path)
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose_detector.process(rgb)
    if not results.pose_landmarks:
        return None
        
    landmarks = results.pose_landmarks.landmark
    row_data = {}
    for name, lm in zip(LANDMARK_NAMES, landmarks):
        row_data[f"{name}_x"] = round(lm.x, 6)
        row_data[f"{name}_y"] = round(lm.y, 6)
        row_data[f"{name}_z"] = round(lm.z, 6)
    return row_data

def process_all_images(output_master=True):
    print(f"Scanning images under: {RAW_IMAGES_DIR}")
    
    mp_pose = mp.solutions.pose
    pose_detector = mp_pose.Pose(static_image_mode=True, model_complexity=1, min_detection_confidence=0.5)
    
    extracted_records = []
    failed_images = []
    
    for root, dirs, files in os.walk(RAW_IMAGES_DIR):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                full_path = os.path.join(root, f)
                meta = parse_image_filename(f)
                landmarks = extract_landmarks_from_image(full_path, pose_detector)
                
                if landmarks is not None:
                    record = {
                        "subject_id": meta["subject_id"],
                        "source_dataset": meta["source_dataset"],
                        "camera_view": meta["camera_view"],
                        "session_id": meta["session_id"],
                        "posture_label": meta["posture_label"],
                        "posture_quality": meta["posture_quality"]
                    }
                    record.update(landmarks)
                    extracted_records.append(record)
                    print(f"[OK] Extracted: {f} ({meta['camera_view']} - {meta['posture_label']})")
                else:
                    failed_images.append(full_path)
                    print(f"[FAIL] Landmark detection failed: {f}")
                    
    print(f"\n--- Summary ---")
    print(f"Total processed: {len(extracted_records) + len(failed_images)}")
    print(f"Success: {len(extracted_records)}")
    print(f"Failed: {len(failed_images)}")
    
    if extracted_records:
        df_new = pd.DataFrame(extracted_records)
        synthetic_csv = os.path.join(os.path.dirname(RAW_IMAGES_DIR), "synthetic_landmarks.csv")
        df_new.to_csv(synthetic_csv, index=False)
        print(f"Saved {len(df_new)} synthetic records to: {synthetic_csv}")
        
        if output_master and os.path.exists(MASTER_CSV_PATH):
            df_master = pd.read_csv(MASTER_CSV_PATH)
            # Remove existing synthetic records to avoid duplicate appending
            df_master_clean = df_master[df_master["source_dataset"] != "synthetic_multiview"]
            # Align columns
            common_cols = [c for c in df_master.columns if c in df_new.columns]
            df_combined = pd.concat([df_master_clean[common_cols], df_new[common_cols]], ignore_index=True)
            df_combined.to_csv(MASTER_CSV_PATH, index=False)
            print(f"Updated master dataset ({MASTER_CSV_PATH}): total {len(df_combined)} rows ({len(df_master_clean)} real + {len(df_new)} synthetic).")

    return extracted_records, failed_images

if __name__ == "__main__":
    process_all_images(output_master=True)
