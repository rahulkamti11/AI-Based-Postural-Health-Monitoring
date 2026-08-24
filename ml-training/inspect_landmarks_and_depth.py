import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

MASTER_CSV_PATH = os.path.join('dataset', 'master_dataset.csv')
EDA_PLOTS_DIR = os.path.join('dataset', 'eda_plots')

def inspect_landmarks_and_depth():
    print(f"Loading master dataset from '{MASTER_CSV_PATH}'...")
    df = pd.read_csv(MASTER_CSV_PATH)
    total_rows = len(df)
    print(f"Total rows in master_dataset.csv: {total_rows}")

    # 1. Face Landmarks Completeness & Non-null/Non-zero Check
    face_cols = ['nose_x', 'nose_y', 'left_eye_x', 'right_eye_x', 'mouth_left_x', 'mouth_right_x']
    
    # Check present columns
    missing_cols = [c for c in face_cols if c not in df.columns]
    if missing_cols:
        print(f"Warning: Missing face columns: {missing_cols}")
        avail_face_cols = [c for c in face_cols if c in df.columns]
    else:
        avail_face_cols = face_cols

    # Check NaN, 0.0, or invalid
    isnull_mask = df[avail_face_cols].isnull().any(axis=1)
    iszero_mask = (df[avail_face_cols] == 0.0).any(axis=1)
    invalid_mask = isnull_mask | iszero_mask
    valid_rows_count = (~invalid_mask).sum()
    valid_pct = (valid_rows_count / total_rows) * 100.0

    print("\n" + "="*70)
    print("=== 1. FACE LANDMARKS CONFIDENCE & COMPLETENESS CHECK ===")
    print("="*70)
    print(f"Target Face Columns Checked: {avail_face_cols}")
    print(f"Rows with Null Values:       {isnull_mask.sum()} ({isnull_mask.sum()/total_rows*100:.2f}%)")
    print(f"Rows with Exact 0.0 Values:  {iszero_mask.sum()} ({iszero_mask.sum()/total_rows*100:.2f}%)")
    print(f"Complete & Valid Face Rows:  {valid_rows_count} / {total_rows} ({valid_pct:.2f}%)")

    # 2. Shoulder Horizontal (x) Ordering Consistency Check
    print("\n" + "="*70)
    print("=== 2. SHOULDER HORIZONTAL (X) ORDERING CHECK ===")
    print("="*70)
    l_less_r = (df['left_shoulder_x'] < df['right_shoulder_x']).sum()
    l_greater_r = (df['left_shoulder_x'] > df['right_shoulder_x']).sum()
    l_equal_r = (df['left_shoulder_x'] == df['right_shoulder_x']).sum()

    pct_less = (l_less_r / total_rows) * 100.0
    pct_greater = (l_greater_r / total_rows) * 100.0
    pct_equal = (l_equal_r / total_rows) * 100.0

    print(f"left_shoulder_x < right_shoulder_x: {l_less_r} ({pct_less:.2f}%) [Standard MediaPipe camera-view orientation]")
    print(f"left_shoulder_x > right_shoulder_x: {l_greater_r} ({pct_greater:.2f}%) [Inverted / Mirrored orientation]")
    print(f"left_shoulder_x == right_shoulder_x: {l_equal_r} ({pct_equal:.2f}%)")

    # 3. Depth (z) Distribution Analysis
    print("\n" + "="*70)
    print("=== 3. DEPTH (Z) DISTRIBUTION ANALYSIS ===")
    print("="*70)
    df['shoulder_z_diff'] = df['left_shoulder_z'] - df['right_shoulder_z']

    print("\n--- nose_z Summary Statistics by Posture Label ---")
    nose_z_stats = df.groupby('posture_label')['nose_z'].agg(['mean', 'std', 'min', 'max']).round(4)
    print(nose_z_stats)

    print("\n--- (left_shoulder_z - right_shoulder_z) Summary Statistics by Posture Label ---")
    sh_diff_stats = df.groupby('posture_label')['shoulder_z_diff'].agg(['mean', 'std', 'min', 'max']).round(4)
    print(sh_diff_stats)

    # Plot distributions
    os.makedirs(EDA_PLOTS_DIR, exist_ok=True)
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # A. Boxplot of nose_z by posture_label
    df.boxplot(column='nose_z', by='posture_label', ax=axes[0, 0], grid=False, rot=25)
    axes[0, 0].set_title("Distribution of nose_z by Posture Label")
    axes[0, 0].set_xlabel("")
    axes[0, 0].set_ylabel("nose_z")

    # B. Boxplot of shoulder_z_diff by posture_label
    df.boxplot(column='shoulder_z_diff', by='posture_label', ax=axes[0, 1], grid=False, rot=25)
    axes[0, 1].set_title("Distribution of (left_shoulder_z - right_shoulder_z) by Posture Label")
    axes[0, 1].set_xlabel("")
    axes[0, 1].set_ylabel("shoulder_z_diff")

    # C. Histogram / KDE of nose_z
    for label, group in df.groupby('posture_label'):
        axes[1, 0].hist(group['nose_z'], bins=20, alpha=0.5, label=label)
    axes[1, 0].set_title("Histogram of nose_z Across Postures")
    axes[1, 0].set_xlabel("nose_z")
    axes[1, 0].set_ylabel("Frequency")
    axes[1, 0].legend(fontsize=8)

    # D. Histogram of shoulder_z_diff
    for label, group in df.groupby('posture_label'):
        axes[1, 1].hist(group['shoulder_z_diff'], bins=20, alpha=0.5, label=label)
    axes[1, 1].set_title("Histogram of (left_shoulder_z - right_shoulder_z) Across Postures")
    axes[1, 1].set_xlabel("shoulder_z_diff")
    axes[1, 1].set_ylabel("Frequency")
    axes[1, 1].legend(fontsize=8)

    plt.suptitle("Face Landmark & Depth (z) Distribution Analysis", fontsize=14, y=1.02)
    plt.tight_layout()

    plot_path = os.path.join(EDA_PLOTS_DIR, 'face_depth_analysis.png')
    plt.savefig(plot_path, bbox_inches='tight', dpi=150)
    plt.close()

    print(f"\n[OK] Depth analysis plots saved to '{plot_path}'")
    print("="*70)

if __name__ == '__main__':
    inspect_landmarks_and_depth()
