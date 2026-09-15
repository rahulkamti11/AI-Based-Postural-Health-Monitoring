import pandas as pd

df_front = pd.read_csv("dataset/features_front.csv")
df_side = pd.read_csv("dataset/features_side.csv")

print("=== FRONT VIEW AVERAGES ===")
print(df_front.groupby("posture_label")[["shoulder_tilt_angle", "head_lateral_offset", "torso_lateral_lean_angle"]].mean().round(2))

print("\n=== SIDE VIEW AVERAGES ===")
print(df_side.groupby("posture_label")[["neck_angle", "torso_lean_angle", "spine_curve_angle"]].mean().round(2))
