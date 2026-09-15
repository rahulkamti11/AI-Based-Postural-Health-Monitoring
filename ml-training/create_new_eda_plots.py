import os
import pandas as pd
import matplotlib.pyplot as plt

FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")
PLOT_DIR = os.path.join("dataset", "eda_plots")

def plot_box(df, x_col, y_col, title, filename):
    plt.figure(figsize=(10, 6))
    
    groups = df.groupby(x_col)[y_col].apply(list)
    labels = groups.index
    data = groups.values
    
    plt.boxplot(data, patch_artist=True)
    plt.xticks(ticks=range(1, len(labels) + 1), labels=labels, rotation=45)
    plt.title(title, fontsize=14)
    plt.ylabel("Angle (Degrees)")
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, filename))
    plt.close()

def main():
    if os.path.exists(FRONT_CSV):
        df_front = pd.read_csv(FRONT_CSV)
        plot_box(df_front, "posture_label", "shoulder_tilt_angle", "Shoulder Tilt Angle by Posture (Front)", "front_shoulder_tilt.png")
        plot_box(df_front, "posture_label", "torso_lateral_lean_angle", "Torso Lateral Lean by Posture (Front)", "front_torso_lean.png")
        print("Front EDA plots generated.")
        
    if os.path.exists(SIDE_CSV):
        df_side = pd.read_csv(SIDE_CSV)
        plot_box(df_side, "posture_label", "neck_angle", "Vertical Neck Angle by Posture (Side)", "side_neck_angle.png")
        plot_box(df_side, "posture_label", "torso_lean_angle", "Torso Lean Angle by Posture (Side)", "side_torso_lean.png")
        plot_box(df_side, "posture_label", "spine_curve_angle", "Spine Curve Angle by Posture (Side)", "side_spine_curve.png")
        print("Side EDA plots generated.")

if __name__ == "__main__":
    main()
