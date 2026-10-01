"""
Exploratory Data Analysis (EDA) Plotting Script
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Generates box plots for canonical biomechanical features across technical posture classes.
"""

import os
import pandas as pd
import matplotlib.pyplot as plt

FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")
PLOT_DIR = os.path.join("dataset", "eda_plots")
os.makedirs(PLOT_DIR, exist_ok=True)


def plot_box(df, x_col, y_col, title, ylabel, filename):
    plt.figure(figsize=(10, 6))

    groups = df.groupby(x_col)[y_col].apply(list)
    labels = groups.index
    data = groups.values

    plt.boxplot(data, patch_artist=True)
    plt.xticks(ticks=range(1, len(labels) + 1), labels=labels, rotation=35, ha='right')
    plt.title(title, fontsize=13, fontweight='bold')
    plt.ylabel(ylabel, fontsize=11)
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()
    save_path = os.path.join(PLOT_DIR, filename)
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Saved: {save_path}")


def main():
    if os.path.exists(FRONT_CSV):
        df_front = pd.read_csv(FRONT_CSV)
        plot_box(df_front, "posture_label", "shoulder_tilt_abs",
                 "Shoulder Tilt Absolute (Deviation from Horizontal)", "Angle (Degrees)", "front_shoulder_tilt.png")
        plot_box(df_front, "posture_label", "torso_lean_abs",
                 "Torso Lateral Lean Absolute by Posture (Front)", "Angle (Degrees)", "front_torso_lean.png")
        plot_box(df_front, "posture_label", "shoulder_symmetry_deviation",
                 "Shoulder Symmetry Deviation by Posture (Front)", "Normalized Deviation", "front_shoulder_symmetry.png")
        plot_box(df_front, "posture_label", "head_lateral_offset_norm",
                 "Head Lateral Offset by Posture (Front)", "Normalized Offset", "front_head_lateral_offset.png")
        print("[OK] Front EDA plots generated.")

    if os.path.exists(SIDE_CSV):
        df_side = pd.read_csv(SIDE_CSV)
        plot_box(df_side, "posture_label", "neck_angle_abs",
                 "Cervical Neck Angle Absolute by Posture (Side)", "Angle (Degrees)", "side_neck_angle.png")
        plot_box(df_side, "posture_label", "torso_lean_abs",
                 "Torso Incline Angle Absolute by Posture (Side)", "Angle (Degrees)", "side_torso_lean.png")
        plot_box(df_side, "posture_label", "head_forward_norm",
                 "Normalized Forward Head Distance by Posture (Side)", "Ratio (Head Fwd / Torso Len)", "side_head_forward.png")
        plot_box(df_side, "posture_label", "spine_deviation_angle",
                 "Spine Deviation Angle (Kyphosis Indicator)", "Angle (Degrees)", "side_spine_curve.png")
        print("[OK] Side EDA plots generated.")


if __name__ == "__main__":
    main()
