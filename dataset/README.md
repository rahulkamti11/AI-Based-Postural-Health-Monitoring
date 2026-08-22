# Dataset Directory — AI-Based Sitting Posture Detection

This directory holds dataset files and extracted features for Phase 1 and Phase 2.

## Directory Structure
- `raw_images/`: Raw images and videos (Phase 2 self-collected multi-camera dataset). *Ignored by git.*
- `public_dataset/`: Raw public datasets (MultiPosture Zenodo CSV, Roboflow keypoint sets, Kaggle spine set). *Ignored by git.*
- `features/`: Derived feature CSVs (`features_front.csv`, `features_left.csv`, `features_right.csv`).
- `master_dataset.csv`: Master landmark single source of truth dataset.
- `metadata.csv`: Dataset record metadata.

## Rules
1. Never manually edit derived CSVs in `features/` — always regenerate from `master_dataset.csv`.
2. Raw media is ignored in `.gitignore` to prevent repository bloat.
