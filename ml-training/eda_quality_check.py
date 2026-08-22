import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

FEATURES_FRONT_PATH = os.path.join('dataset', 'features', 'features_front.csv')
EDA_PLOTS_DIR = os.path.join('dataset', 'eda_plots')

def run_eda_quality_check():
    print(f"Loading front features from '{FEATURES_FRONT_PATH}'...")
    df = pd.read_csv(FEATURES_FRONT_PATH)

    os.makedirs(EDA_PLOTS_DIR, exist_ok=True)
    feature_cols = ['shoulder_tilt_angle', 'shoulder_symmetry_ratio', 'head_lateral_offset', 'torso_lateral_lean_angle']

    print("\n" + "="*70)
    print("=== FEATURE SUMMARY STATISTICS (MEAN ± STD) BY POSTURE LABEL ===")
    print("="*70)
    grouped = df.groupby('posture_label')[feature_cols]
    stats_mean = grouped.mean()
    stats_std = grouped.std()
    
    summary_table = pd.DataFrame()
    for col in feature_cols:
        summary_table[col] = stats_mean[col].round(3).astype(str) + " ± " + stats_std[col].round(3).astype(str)
    print(summary_table)

    print("\n" + "="*70)
    print("=== FEATURE SUMMARY STATISTICS BY POSTURE QUALITY (GOOD vs BAD) ===")
    print("="*70)
    grouped_q = df.groupby('posture_quality')[feature_cols]
    q_mean = grouped_q.mean()
    q_std = grouped_q.std()
    q_table = pd.DataFrame()
    for col in feature_cols:
        q_table[col] = q_mean[col].round(3).astype(str) + " ± " + q_std[col].round(3).astype(str)
    print(q_table)

    # 1. Boxplots grouped by posture_label
    plt.figure(figsize=(14, 10))
    for i, col in enumerate(feature_cols, 1):
        plt.subplot(2, 2, i)
        df.boxplot(column=col, by='posture_label', ax=plt.gca(), grid=False, rot=25)
        plt.title(f"Distribution of {col}")
        plt.xlabel("")
        plt.ylabel(col)
    plt.suptitle("Front View Features by Technical Posture Label", fontsize=14, y=1.02)
    plt.tight_layout()
    plot_label_path = os.path.join(EDA_PLOTS_DIR, 'front_features_by_posture_label.png')
    plt.savefig(plot_label_path, bbox_inches='tight', dpi=150)
    plt.close()
    print(f"\n[OK] Boxplots grouped by posture_label saved to '{plot_label_path}'")

    # 2. Boxplots grouped by posture_quality (Good vs Bad)
    plt.figure(figsize=(14, 10))
    for i, col in enumerate(feature_cols, 1):
        plt.subplot(2, 2, i)
        df.boxplot(column=col, by='posture_quality', ax=plt.gca(), grid=False)
        plt.title(f"Distribution of {col} (Good vs Bad)")
        plt.xlabel("")
        plt.ylabel(col)
    plt.suptitle("Front View Features by Posture Quality (Good vs Bad)", fontsize=14, y=1.02)
    plt.tight_layout()
    plot_quality_path = os.path.join(EDA_PLOTS_DIR, 'front_features_by_posture_quality.png')
    plt.savefig(plot_quality_path, bbox_inches='tight', dpi=150)
    plt.close()
    print(f"[OK] Boxplots grouped by posture_quality saved to '{plot_quality_path}'")

if __name__ == '__main__':
    run_eda_quality_check()
