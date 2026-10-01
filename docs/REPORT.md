# Technical Report: AI-Based Sitting Posture Detection and Postural Health Monitoring System

## 1. Project Overview
This project delivers a real-time, privacy-preserving, Multi-Camera Artificial Intelligence platform to monitor sitting ergonomics. It leverages **MediaPipe Pose** executing locally within the browser (WebAssembly/WebGL) for real-time 3D skeleton keypoint extraction, ensuring user video feeds never leave the client machine. The extracted keypoints are streamed via **WebSocket** to a high-performance **FastAPI Machine Learning Backend**, which extracts canonical biomechanical angles, evaluates trained machine learning classifiers, and coordinates real-time ergonomic feedback.

---

## 2. System Architecture & Multi-Camera Fallback

### 2.1 Unified Architecture Pipeline
The end-to-end data flow operates through a decoupled, low-bandwidth architecture:
```
Camera Video Streams (Front, Left, Right)
  → MediaPipe Pose Lite (Client Browser via WASM @ ~10 FPS)
  → Keypoint Visibility Thresholding (>= 0.5)
  → WebSocket JSON Stream (/ws/posture)
  → Pydantic Schema Validation (backend/app/schemas/posture_schema.py)
  → Shared Canonical Feature Engineering (backend/app/pose/canonical_features.py)
  → Front & Side Champion ML Classifiers (Random Forest)
  → Rule Engine Priority Fusion & 7-Frame Majority Voting (backend/app/inference/binary_logic.py)
  → Frontend Live Telemetry Dashboard & Alert Modals
```

### 2.2 Independent Expert Camera Models
A single camera cannot mathematically capture all postural defects (e.g., a 2D front webcam cannot reliably measure sagittal cervical flexion or lumbar slouching). The system therefore divides posture assessment into plane-specific expert models:

1. **Front Camera Inference (Coronal Plane)**
   - Monitors lateral symmetry and coronal trunk lean.
   - **Target Labels:** `asymmetricalLean` vs `normal`.
2. **Side Camera Inference (Sagittal Plane)**
   - Monitors spinal flexion/extension, anterior head projection, and seat slippage.
   - Supports Left, Right, or Dual-Side camera views with automated coordinate orientation normalization.
   - **Target Labels:** `forwardHead` (Text-Neck), `slouch` (Thoracic Kyphosis), `slidingDown` (Sacral Sitting) vs `normal`.

### 2.3 Multi-Camera Fusion Priority & Graceful Degradation
- **Priority 1 (Sagittal Spinal Defects)**: If any active side camera detects `forwardHead`, `slouch`, or `slidingDown`, an overall `bad` quality alert is triggered immediately with targeted corrective feedback.
- **Priority 2 (Coronal Lateral Defects)**: If side cameras report normal (or are offline) but the front camera detects `asymmetricalLean`, an overall `bad` quality alert is triggered.
- **Priority 3 (Balanced Posture)**: When all active cameras detect normal alignment, overall quality is reported as `good` (`upright`).
- **Graceful Fallback**: If only a single camera is connected (e.g., laptop webcam), the backend dynamically monitors defects observable in that plane without throwing errors. If key joints fall below the visibility threshold ($\ge 0.5$), the system transitions to `no_person`/`standby` without fabricating synthetic coordinates.

---

## 3. Dataset Specification

The curated multi-camera dataset consists of 10 diverse human subjects (`subject01` through `subject10`) performing standardized ergonomic sitting postures across front, left, and right camera views.

- **Total Media Records**: 278 landmark image samples in `dataset/master_dataset.csv`.
- **Front View**: 78 samples (38 `asymmetricalLean`, 40 `normal` [`upright`, `armrests`, `focus`, `recline`]).
- **Side Views (Left & Right)**: 200 samples (40 `forwardHead`, 40 `slouch`, 40 `slidingDown`, 80 `normal`).

---

## 4. Canonical Feature Engineering

All linear measurements are scale-normalized using anatomical body segments (`shoulder_width` for front features, `torso_length` for side features), rendering the system invariant to camera distance and image resolution.

### 4.1 Front Biomechanical Features
1. **`shoulder_tilt_abs`**: Absolute deviation of the inter-shoulder line from horizontal ($0^\circ = \text{level}$, alert at $> 7^\circ$).
2. **`shoulder_symmetry_deviation`**: Absolute difference in Euclidean distance from nose to left vs right shoulder, normalized by shoulder width ($0.0 = \text{symmetric}$).
3. **`head_lateral_offset_norm`**: Absolute horizontal displacement of nose from the inter-shoulder midpoint, normalized by shoulder width.
4. **`torso_lean_abs`**: Absolute lateral inclination angle of the trunk vector (mid-hip to mid-shoulder) from vertical ($0^\circ = \text{upright}$, alert at $> 15^\circ$).

### 4.2 Side Biomechanical Features
1. **`neck_angle_abs`**: Absolute cervical inclination angle (shoulder to ear) relative to vertical ($s = \pm 1$ view-adjusted).
2. **`torso_lean_abs`**: Absolute trunk incline angle (hip to shoulder) relative to vertical.
3. **`head_forward_norm`**: Anterior horizontal projection of ear relative to shoulder, normalized by torso length.
4. **`spine_deviation_angle`**: Biomechanical angle between the torso vector ($\vec{v}_{\text{hip}\to\text{shoulder}}$) and cervical vector ($\vec{v}_{\text{shoulder}\to\text{ear}}$).

---

## 5. Machine Learning Benchmarks & Validation Results

### 5.1 Evaluation Methodology
To prevent data leakage, evaluation is conducted **strictly subject-independent**:
- **Holdout Test Set**: Unseen subjects `subject09` and `subject10` (never seen during training).
- **Group Cross-Validation**: 5-Fold `GroupKFold` cross-validation partitioned by `subject_id`.
- Models benchmarked: **Random Forest** (100 estimators) vs **Linear SVM** (with `StandardScaler`).

### 5.2 Front Model Performance (`asymmetricalLean` vs `normal`)
- **Holdout Test Accuracy (Unseen Subjects)**: **100.00%** (Random Forest & Linear SVM)
- **Holdout F1-Macro**: **1.0000**
- **5-Fold Group Cross-Validation Accuracy**: **100.00%**
- **Confusion Matrix** on holdout test set ($N=16$):
  - Normal: 8 / 8 correct (100% precision, 100% recall)
  - Asymmetrical Lean: 8 / 8 correct (100% precision, 100% recall)
- **Champion**: Random Forest (`saved_models/front_model.pkl`).

### 5.3 Side Model Performance (`forwardHead`, `slouch`, `slidingDown` vs `normal`)
- **Holdout Test Accuracy (Unseen Subjects)**: **62.50%** (Champion: Random Forest)
- **Holdout F1-Macro**: **0.5954**
- **5-Fold Group Cross-Validation Accuracy**: **67.50%** (Random Forest) / **73.00%** (Linear SVM)
- **Holdout Classification Breakdown** ($N=40$ across unseen subjects):
  - `normal`: Precision = 0.71, Recall = 0.75, F1 = 0.73 ($N=16$)
  - `slidingDown`: Precision = 0.71, Recall = 0.62, F1 = 0.67 ($N=8$)
  - `slouch`: Precision = 0.45, Recall = 0.62, F1 = 0.53 ($N=8$)
  - `forwardHead`: Precision = 0.60, Recall = 0.38, F1 = 0.46 ($N=8$)
- **Clinical Observation**: Biomechanical overlap between cervical kyphosis (`slouch`) and cervical protrusion (`forwardHead`) is clinically expected in 2D monocular side views, while trunk-dominant defect `slidingDown` and `normal` postures exhibit clear separability.

---

## 6. Implementation Integrity & Verification

A dedicated verification test suite ([tests/test_pipeline_consistency.py](file:///d:/Rahul/9.Projects/7.%207th%20sem%20Minor%20Project/project/tests/test_pipeline_consistency.py)) validates the entire pipeline:
1. **Mathematical Identity**: Verifies that offline feature extraction in `build_features.py` and live WebSocket extraction in `mediapipe_extractor.py` produce identical numerical features within $10^{-6}$ tolerance.
2. **Zero Fabrication**: Verifies that frames with occluded hips or low visibility ($< 0.5$) return `None` rather than fabricating synthetic joints.
3. **View Symmetry**: Verifies that Left and Right camera views produce identical positive forward head metrics for mirrored postures.
4. **End-to-End Inference**: Validates live ML prediction outputs across deterministic normal and defective posture fixtures.
5. **Multi-Camera Degradation**: Validates all fallback states (offline, no person, single front, single side, dual side, full trio).
