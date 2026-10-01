"""
Simple Bar and Scatter EDA Plot Generator
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import os
import pandas as pd
import matplotlib.pyplot as plt

FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")
PLOT_DIR = os.path.join("dataset", "eda_plots")
os.makedirs(PLOT_DIR, exist_ok=True)


def plot_bar_and_scatter(df, x_col, y_col, title_prefix, ylabel, filename_prefix):
    # 1. Bar Chart (Averages)
    plt.figure(figsize=(9, 5))
    avg_data = df.groupby(x_col)[y_col].mean().sort_values()
    avg_data.plot(kind='bar', color='#3b82f6', edgecolor='black', alpha=0.85)
    plt.title(f"{title_prefix} (Mean Value by Posture)", fontsize=13, fontweight='bold')
    plt.ylabel(ylabel, fontsize=11)
    plt.xticks(rotation=35, ha='right')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.tight_layout()
    bar_path = os.path.join(PLOT_DIR, f"{filename_prefix}_bar.png")
    plt.savefig(bar_path, dpi=150)
    plt.close()

    # 2. Scatter Plot
    plt.figure(figsize=(9, 5))
    plt.scatter(df[x_col], df[y_col], alpha=0.65, color='#ef4444', s=45, edgecolor='black', linewidth=0.5)
    plt.title(f"{title_prefix} (Individual Sample Scatter)", fontsize=13, fontweight='bold')
    plt.ylabel(ylabel, fontsize=11)
    plt.xticks(rotation=35, ha='right')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.tight_layout()
    scatter_path = os.path.join(PLOT_DIR, f"{filename_prefix}_scatter.png")
    plt.savefig(scatter_path, dpi=150)
    plt.close()
    print(f"Saved: {bar_path} & {scatter_path}")


def main():
    if os.path.exists(FRONT_CSV):
        df_front = pd.read_csv(FRONT_CSV)
        plot_bar_and_scatter(df_front, "posture_label", "shoulder_tilt_abs",
                             "Shoulder Tilt Absolute", "Angle (Degrees)", "front_shoulder")
        plot_bar_and_scatter(df_front, "posture_label", "torso_lean_abs",
                             "Torso Lateral Lean Absolute", "Angle (Degrees)", "front_torso")

    if os.path.exists(SIDE_CSV):
        df_side = pd.read_csv(SIDE_CSV)
        plot_bar_and_scatter(df_side, "posture_label", "neck_angle_abs",
                             "Neck Angle Absolute", "Angle (Degrees)", "side_neck")
        plot_bar_and_scatter(df_side, "posture_label", "head_forward_norm",
                             "Head Forward Displacement", "Ratio (Normalized)", "side_head_fwd")


if __name__ == "__main__":
    main()
