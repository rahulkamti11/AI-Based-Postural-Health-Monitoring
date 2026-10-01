import os
import math
import pandas as pd
import numpy as np

MASTER_CSV = os.path.join("dataset", "master_dataset.csv")
FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")

EPS = 1e-8
META_COLS = ["filename", "subject_id", "camera_view", "posture_label", "posture_quality"]


def distance(x1, y1, x2, y2):
    return math.hypot(x2 - x1, y2 - y1)


def angle_vertical(x1, y1, x2, y2):
    """Signed angle from vertical (0 = straight up). Image y-axis points down."""
    dx, dy = x2 - x1, y2 - y1
    if abs(dx) < EPS and abs(dy) < EPS:
        return np.nan
    return math.degrees(math.atan2(dx, -dy))


def angle_horizontal(x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if abs(dx) < EPS and abs(dy) < EPS:
        return np.nan
    return math.degrees(math.atan2(dy, dx))


def angle_between(v1x, v1y, v2x, v2y):
    m1, m2 = math.hypot(v1x, v1y), math.hypot(v2x, v2y)
    if m1 < EPS or m2 < EPS:
        return np.nan
    c = max(-1.0, min(1.0, (v1x * v2x + v1y * v2y) / (m1 * m2)))
    return math.degrees(math.acos(c))


def safe_ratio(a, b):
    return a / b if abs(b) > EPS else np.nan


def r(v, n):
    return round(v, n) if not (isinstance(v, float) and math.isnan(v)) else np.nan


def front_features(row):
    lsx, lsy = row["left_shoulder_x"], row["left_shoulder_y"]
    rsx, rsy = row["right_shoulder_x"], row["right_shoulder_y"]
    lhx, lhy = row["left_hip_x"], row["left_hip_y"]
    rhx, rhy = row["right_hip_x"], row["right_hip_y"]
    nx, ny = row["nose_x"], row["nose_y"]

    shoulder_width = distance(lsx, lsy, rsx, rsy)
    msx, msy = (lsx + rsx) / 2, (lsy + rsy) / 2
    mhx, mhy = (lhx + rhx) / 2, (lhy + rhy) / 2
    torso_length = distance(mhx, mhy, msx, msy)

    tilt = angle_horizontal(lsx, lsy, rsx, rsy)
    lean = angle_vertical(mhx, mhy, msx, msy)

    head_lat = nx - msx
    head_vert = msy - ny

    # Nose-to-shoulder distance asymmetry (0 = symmetric)
    dl = distance(nx, ny, lsx, lsy)
    dr = distance(nx, ny, rsx, rsy)
    sym_signed = safe_ratio(dl - dr, shoulder_width)
    sym_dev = abs(sym_signed)

    return {
        "shoulder_width": r(shoulder_width, 5),
        "shoulder_tilt_signed": r(tilt, 4),
        "shoulder_tilt_abs": r(abs(tilt), 4),
        "shoulder_symmetry_signed": r(sym_signed, 5),
        "shoulder_symmetry_deviation": r(sym_dev, 5),
        "torso_length": r(torso_length, 5),
        "torso_lean_signed": r(lean, 4),
        "torso_lean_abs": r(abs(lean), 4),
        "head_lateral_offset": r(head_lat, 5),
        "head_lateral_offset_norm": r(safe_ratio(head_lat, shoulder_width), 5),
        "head_vertical_offset": r(head_vert, 5),
        "head_vertical_offset_norm": r(safe_ratio(head_vert, torso_length), 5),
    }


def side_features(row, view):
    p = view + "_"
    ear_x, ear_y = row[p + "ear_x"], row[p + "ear_y"]
    sh_x, sh_y = row[p + "shoulder_x"], row[p + "shoulder_y"]
    hip_x, hip_y = row[p + "hip_x"], row[p + "hip_y"]

    # Mirror left view so "forward" is the same positive direction for both cameras
    s = -1.0 if view == "left" else 1.0

    torso_length = distance(sh_x, sh_y, hip_x, hip_y)
    neck_length = distance(sh_x, sh_y, ear_x, ear_y)

    torso_lean = s * angle_vertical(hip_x, hip_y, sh_x, sh_y)
    neck_angle = s * angle_vertical(sh_x, sh_y, ear_x, ear_y)

    head_forward = s * (ear_x - sh_x)
    head_vertical = sh_y - ear_y

    spine_dev = angle_between(sh_x - hip_x, sh_y - hip_y,
                              ear_x - sh_x, ear_y - sh_y)

    return {
        "torso_length": r(torso_length, 5),
        "torso_lean_signed": r(torso_lean, 4),
        "torso_lean_abs": r(abs(torso_lean), 4),
        "neck_length": r(neck_length, 5),
        "neck_length_norm": r(safe_ratio(neck_length, torso_length), 5),
        "neck_angle_signed": r(neck_angle, 4),
        "neck_angle_abs": r(abs(neck_angle), 4),
        "head_forward": r(head_forward, 5),
        "head_forward_norm": r(safe_ratio(head_forward, torso_length), 5),
        "head_vertical": r(head_vertical, 5),
        "head_vertical_norm": r(safe_ratio(head_vertical, torso_length), 5),
        "spine_deviation_angle": r(spine_dev, 4),
    }


def process_features():
    if not os.path.exists(MASTER_CSV):
        print("Master dataset not found!")
        return

    df = pd.read_csv(MASTER_CSV)
    front, side = [], []

    for _, row in df.iterrows():
        view = str(row["camera_view"]).lower()
        meta = {c: row[c] for c in META_COLS}
        try:
            if view == "front":
                front.append({**meta, **front_features(row)})
            elif view in ("left", "right"):
                side.append({**meta, **side_features(row, view)})
        except Exception as e:
            print(f"Feature error ({view}) - {row['filename']}: {e}")

    pd.DataFrame(front).to_csv(FRONT_CSV, index=False)
    pd.DataFrame(side).to_csv(SIDE_CSV, index=False)
    print(f"Saved {len(front)} front records to {FRONT_CSV}")
    print(f"Saved {len(side)} side records to {SIDE_CSV}")


if __name__ == "__main__":
    process_features()