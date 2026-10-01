"""
Offline Feature Generation Script
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Uses the shared canonical feature calculator (backend.app.pose.canonical_features)
to generate features_front.csv and features_side.csv directly from master_dataset.csv.
Guarantees 100% mathematical identity with real-time inference.
"""

import os
import sys
from pathlib import Path
import pandas as pd

# Add repo root to sys.path so backend modules can be imported directly
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.pose.canonical_features import (
    compute_canonical_front_features,
    compute_canonical_side_features,
    row_to_landmarks_front,
    row_to_landmarks_side,
    CANONICAL_FRONT_FEATURES,
    CANONICAL_SIDE_FEATURES
)

MASTER_CSV = os.path.join(REPO_ROOT, "dataset", "master_dataset.csv")
FRONT_CSV = os.path.join(REPO_ROOT, "dataset", "features_front.csv")
SIDE_CSV = os.path.join(REPO_ROOT, "dataset", "features_side.csv")

META_COLS = ["filename", "subject_id", "camera_view", "posture_label", "posture_quality"]


def process_features():
    if not os.path.exists(MASTER_CSV):
        print(f"Master dataset not found at {MASTER_CSV}!")
        return

    df = pd.read_csv(MASTER_CSV)
    front, side = [], []

    for _, row in df.iterrows():
        view = str(row["camera_view"]).lower()
        meta = {c: row[c] for c in META_COLS}

        try:
            if view == "front":
                lm = row_to_landmarks_front(row)
                feats = compute_canonical_front_features(lm)
                if feats is not None:
                    front.append({**meta, **feats})
                else:
                    print(f"[Warning] Invalid/missing front landmarks for {row['filename']}")

            elif view in ("left", "right"):
                lm = row_to_landmarks_side(row, view)
                feats = compute_canonical_side_features(lm, view=view)
                if feats is not None:
                    side.append({**meta, **feats})
                else:
                    print(f"[Warning] Invalid/missing side landmarks for {row['filename']}")

        except Exception as e:
            print(f"Feature calculation error ({view}) - {row['filename']}: {e}")

    df_front = pd.DataFrame(front)
    df_side = pd.DataFrame(side)

    # Ensure deterministic column order: metadata columns first, then canonical features
    df_front = df_front[META_COLS + CANONICAL_FRONT_FEATURES]
    df_side = df_side[META_COLS + CANONICAL_SIDE_FEATURES]

    df_front.to_csv(FRONT_CSV, index=False)
    df_side.to_csv(SIDE_CSV, index=False)

    print(f"Successfully saved {len(df_front)} front records to {FRONT_CSV}")
    print(f"Canonical front feature columns: {CANONICAL_FRONT_FEATURES}")
    print(f"Successfully saved {len(df_side)} side records to {SIDE_CSV}")
    print(f"Canonical side feature columns: {CANONICAL_SIDE_FEATURES}")


if __name__ == "__main__":
    process_features()