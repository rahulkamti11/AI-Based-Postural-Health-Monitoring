"""
Extract 33 MediaPipe 3D Pose Landmarks from Dataset Raw Images.
Recursively scans dataset/raw_images/, computes normalized (x, y, z, v) landmarks, 
and generates dataset/master_dataset.csv.
"""

import os
import cv2
import pandas as pd
import mediapipe as mp

RAW_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "raw_images"))
MASTER_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "master_dataset.csv"))

# The 33 MediaPipe landmark names
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
]

KNOWN_POSTURE_LABELS = {
    "asymmetricalLean", "forwardHead", "slouch", "slidingDown",
    "armrests", "focus", "recline", "upright"
}

def parse_image_filename(filename):
    base = os.path.splitext(filename)[0]
    parts = base.split("_")
    if len(parts) < 5:
        return None

    subject_id = parts[0]
    camera_view = parts[1]
    posture_quality = parts[2]
    remaining = parts[3:]

    label = None
    variation = None
    for known in KNOWN_POSTURE_LABELS:
        if remaining[0].lower() == known.lower():
            label = known
            variation = "_".join(remaining[1:])
            break

    if label is None:
        label = "_".join(parts[3:-1])
        variation = parts[-1]

    return {
        "filename": filename,
        "subject_id": subject_id,
        "camera_view": camera_view,
        "posture_quality": posture_quality,
        "posture_label": label,
        "variation": variation
    }


def extract_landmarks(image_path, pose_detector):
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
        row_data[f"{name}_v"] = round(lm.visibility, 6)
    return row_data

def process_all_images():
    print(f"Scanning images under: {RAW_IMAGES_DIR}")
    mp_pose = mp.solutions.pose
    pose_detector = mp_pose.Pose(static_image_mode=True, model_complexity=2, min_detection_confidence=0.5)
    extracted_records = []
    failed_images = []
    
    for root, dirs, files in os.walk(RAW_IMAGES_DIR):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                full_path = os.path.join(root, f)
                meta = parse_image_filename(f)
                if meta is None:
                    continue
                landmarks = extract_landmarks(full_path, pose_detector)
                if landmarks is not None:
                    record = meta.copy()
                    record.update(landmarks)
                    extracted_records.append(record)
                    print(f"[OK] {f}")
                else:
                    failed_images.append(f)
                    print(f"[FAIL] {f}")
                    
    print("\n--- Summary ---")
    print(f"Total processed: {len(extracted_records) + len(failed_images)}")
    print(f"Success: {len(extracted_records)}")
    print(f"Failed: {len(failed_images)}")
    
    if extracted_records:
        df_new = pd.DataFrame(extracted_records)
        df_new.to_csv(MASTER_CSV_PATH, index=False)
        print(f"Saved {len(df_new)} records to {MASTER_CSV_PATH}")

if __name__ == "__main__":
    process_all_images()
