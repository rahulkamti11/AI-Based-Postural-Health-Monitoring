import os
import pandas as pd
import matplotlib.pyplot as plt

FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")
PLOT_DIR = os.path.join("dataset", "eda_plots")

def plot_bar_and_scatter(df, x_col, y_col, title_prefix, filename_prefix):
    # 1. Bar Chart (Averages)
    plt.figure(figsize=(10, 6))
    avg_data = df.groupby(x_col)[y_col].mean().sort_values()
    avg_data.plot(kind='bar', color='skyblue', edgecolor='black')
    plt.title(f"{title_prefix} (Bar Chart - Averages)", fontsize=14)
    plt.ylabel("Average Angle (Degrees)")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, f"{filename_prefix}_bar.png"))
    plt.close()

    # 2. Scatter Plot
    plt.figure(figsize=(10, 6))
    plt.scatter(df[x_col], df[y_col], alpha=0.6, color='red', s=50)
    plt.title(f"{title_prefix} (Scatter Plot - Every Image as a Dot)", fontsize=14)
    plt.ylabel("Angle (Degrees)")
    plt.xticks(rotation=45)
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, f"{filename_prefix}_scatter.png"))
    plt.close()

def main():
    if os.path.exists(FRONT_CSV):
        df_front = pd.read_csv(FRONT_CSV)
        plot_bar_and_scatter(df_front, "posture_label", "shoulder_tilt_angle", "Shoulder Tilt", "front_shoulder")
        
    if os.path.exists(SIDE_CSV):
        df_side = pd.read_csv(SIDE_CSV)
        plot_bar_and_scatter(df_side, "posture_label", "neck_angle", "Neck Angle (CVA)", "side_neck")

if __name__ == "__main__":
    main()
