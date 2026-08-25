# Technical Documentation: AI-Based Sitting Posture Detection and Postural Health Monitoring System

## 1. Executive Summary

This document provides technical documentation for the **AI-Based Sitting Posture Detection and Postural Health Monitoring System**, an IEEE-targeted computer vision and machine learning platform designed for real-time ergonomic monitoring. The system analyzes upper-body pose keypoints captured via standard RGB camera streams, computes geometric spatial relationships, and applies a hybrid inference engine—combining deterministic clinical rule thresholds with trained classical machine learning classifiers—to identify spinal misalignment and ergonomic hazards.

Phase 1 focuses on building a robust front-camera detection pipeline using pre-extracted MediaPipe Pose landmark datasets (MultiPosture Zenodo dataset), establishing a single source of truth dataset schema, de-duplicating continuous held-posture frames, benchmarking classical classifiers, implementing a multi-camera graceful degradation fusion engine, and serving real-time predictions to an interactive React dashboard with session analytics and togglable audio/visual alerts.

---

## 2. System Architecture

The software architecture follows a decoupled, modular design divided into three primary layers:

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND LAYER                                    |
|              React (Vite) Dashboard + Tailwind CSS + Recharts Visualization        |
|  +-----------------------------------------------------------------------------+  |
|  | WebRTC Video Capture -> MediaPipe JS Keypoint Extractor -> WebSocket Client  |  |
|  |  CameraCard.jsx | SessionSummary.jsx | BadPostureModal.jsx | AlertBanner.jsx  |  |
|  |  PostureLiveView.jsx | CameraStatus.jsx | PostureHistoryChart.jsx           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | Genuine Landmark JSON (Client -> Server)
                                         | Prediction & Feature JSON (Server -> Client)
                                         v
+-----------------------------------------------------------------------------------+
|                                 BACKEND LAYER                                     |
|                       FastAPI Server (Python 3.12)                                |
|  +-----------------------------------------------------------------------------+  |
|  |                            Inference Engine                                 |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  |  |   Rule Engine Evaluator   | ----> | ML Classifier Fallback (SVM RBF)  |  |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  |                                  |                                          |  |
|  |                                  v                                          |  |
|  |                     Weighted Camera Fusion Engine                           |  |
|  |       (Front: 1.2, Left: 1.0, Right: 1.0) + Degradation Mode Tracker       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Posture Labeling & Two-Tier Classification Scheme

The system enforces a two-tier labeling scheme:
1. **Technical `posture_label` (6 Classes):** Fine-grained clinical classifications used for ML model training and targeted ergonomic feedback.
2. **Derived `posture_quality` (`good` / `bad`):** A top-level binary indicator automatically calculated via the rule:
   $$\text{posture\_quality} = \begin{cases} \text{good}, & \text{if } \text{posture\_label} = \text{neutral\_spinal\_alignment} \\ \text{bad}, & \text{otherwise} \end{cases}$$

### Class Definitions & Clinical Health Risk Mapping

| Technical `posture_label` | `posture_quality` | Detection View | Skeleton Overlay Color | Ergonomic Health Risk & Literature Backing |
|---|---|---|---|---|
| `neutral_spinal_alignment` | `good` | Front + Side | **Green (`#10b981`)** | Balanced spine alignment; minimal muscular strain. |
| `thoracic_kyphotic_slouch` | `bad` | Side | **Red (`#ef4444`)** | Increased intervertebral disc pressure; elevated risk of lumbar disc herniation over prolonged sitting. |
| `cervical_forward_head_posture` | `bad` | Side | **Red (`#ef4444`)** | Strains cervical extensor musculature; directly associated with elevated neck pain severity (CVA $< 48\text{--}50^\circ$). |
| `lateral_trunk_tilt_left` | `bad` | Front | **Red (`#ef4444`)** | Asymmetric coronal loading; uneven muscular fatigue across left shoulder/torso. |
| `lateral_trunk_tilt_right` | `bad` | Front | **Red (`#ef4444`)** | Asymmetric coronal loading; uneven muscular fatigue across right shoulder/torso. |
| `posterior_trunk_recline` | `bad` | Side | **Red (`#ef4444`)** | Excessive backward lean without lumbar support; linked to reduced natural lumbar lordosis. |

---

## 4. Multi-Camera Hardware Setup & Graceful Degradation Strategy

### Camera Setup & Smart Auto-Mapping
- **Front Camera (Cam 1):** Laptop built-in webcam (coronal plane view).
- **Left Camera (Cam 2):** Mobile camera via Iriun/DroidCam WiFi stream (sagittal plane view).
- **Right Camera (Cam 3):** Mobile camera via Iriun/DroidCam WiFi stream (sagittal plane view).

### Dynamic Degradation Logic
To prevent system failure when one or more cameras are disconnected, the inference pipeline dynamically adapts its behavior based on active camera availability:

| Active Cameras | Fusion Behavior | Reported UI Mode |
|---|---|---|
| **Front + Left + Right** | Evaluates all 3 per-camera models/rules; combines predictions via weighted voting (Front weight $1.2$, Side weights $1.0$). | `Full 3-Camera Analysis` |
| **Front + 1 Side** | Combines Front model + active Side model via weighted voting. | `Partial Dual-Camera Analysis` |
| **Front Only** | Runs front-camera model and rule engine exclusively (detects lateral tilt and shoulder asymmetry). | `Single-Camera Analysis (Front-View)` |
| **1 Side Only** | Runs side-camera model exclusively (detects CVA forward head and thoracic slouching). | `Single-Camera Analysis (Side-View)` |

---

## 5. Dataset Pipeline & Subsampling Strategy

### 5.1 Raw Public Dataset Sourcing
The primary public dataset utilized for front-view model development is the **MultiPosture Dataset** (Zenodo Record ID `14230872`, Carneros-Prado et al., 2024, CC BY 4.0), comprising pre-extracted 33 MediaPipe landmark coordinates across 4,794 raw frames from 13 unique subjects.

### 5.2 Remapping Table
Raw `upperbody_label` entries from MultiPosture are remapped to technical project labels:
- `TUP` (Trunk Upright) $\rightarrow$ `neutral_spinal_alignment`
- `TLF` (Trunk Leaning Forward) $\rightarrow$ `thoracic_kyphotic_slouch`
- `TLB` (Trunk Leaning Backward) $\rightarrow$ `posterior_trunk_recline`
- `TLL` (Trunk Leaning Left) $\rightarrow$ `lateral_trunk_tilt_left`
- `TLR` (Trunk Leaning Right) $\rightarrow$ `lateral_trunk_tilt_right`

### 5.3 Session-Based Frame Subsampling ($N=5$)
Because the dataset records continuous held postures frame-by-frame, consecutive frames exhibit minimal variation. Training on raw consecutive frames introduces redundancy and risks near-duplicate frame leakage between train and test splits.

To address this:
1. Consecutive rows sharing the same `subject_id` and `posture_label` are grouped into continuous `session_id` blocks.
2. Within each session block, every $5^{\text{th}}$ frame ($N=5$) is retained, while **first and last endpoint frames are strictly preserved**.
3. **Result:** Reduced dataset size from **4,794** to **1,029** clean frames (**78.54% redundancy reduction**), while maintaining exact relative class distributions.

---

## 6. Feature Engineering Geometry & Formulas

From the master landmark dataset, 4 core front geometric features are calculated per frame:

1. **Shoulder Tilt Angle (`shoulder_tilt_angle`):**
   $$\theta_{\text{shoulder}} = \text{atan2}(y_{\text{right\_shoulder}} - y_{\text{left\_shoulder}}, x_{\text{right\_shoulder}} - x_{\text{left\_shoulder}}) \times \frac{180}{\pi}$$

2. **Shoulder Symmetry Ratio (`shoulder_symmetry_ratio`):**
   $$R_{\text{symmetry}} = \frac{d(\text{nose}, \text{left\_shoulder})}{d(\text{nose}, \text{right\_shoulder}) + \epsilon}$$

3. **Head Lateral Offset (`head_lateral_offset`):**
   $$\Delta x_{\text{head}} = x_{\text{nose}} - \frac{x_{\text{left\_shoulder}} + x_{\text{right\_shoulder}}}{2}$$

4. **Torso Lateral Lean Angle (`torso_lateral_lean_angle`):**
   $$\theta_{\text{torso}} = \text{atan2}(x_{\text{shoulder\_mid}} - x_{\text{hip\_mid}}, -(y_{\text{shoulder\_mid}} - y_{\text{hip\_mid}})) \times \frac{180}{\pi}$$

---

## 7. Deterministic Rule Engine Thresholds

The rule engine (`backend/app/inference/rule_engine.py`) executes prior to ML classification. Thresholds are categorized by confidence levels:

```
+-------------------------------------------------------------------------------------------+
|                                    RULE ENGINE THRESHOLDS                                 |
+-------------------------------------------------------------------------------------------+
| Feature                   | Threshold Cutoff  | Triggered Class             | Confidence  |
+---------------------------+-------------------+-----------------------------+-------------+
| torso_lateral_lean_angle  | > +15.0°          | lateral_trunk_tilt_left     | Empirical   |
| torso_lateral_lean_angle  | < -15.0°          | lateral_trunk_tilt_right    | Empirical   |
| shoulder_tilt_angle       | Dev > 12.0°       | lateral_trunk_tilt_left/rt  | Adapted     |
| neck_angle (Side CVA)     | < 48.0°           | cervical_forward_head_post  | Strong Lit  |
| torso_lean_angle (Side)   | > 25.0°           | posterior_trunk_recline     | Empirical   |
+-------------------------------------------------------------------------------------------+
```

---

## 8. Machine Learning Model Benchmarking & Validation

### 8.1 Validation Methodology (GroupKFold Cross-Validation)
5-Fold GroupKFold Cross-Validation grouped strictly by `subject_id` (13 subjects total; 10 subjects in train split, 3 subjects in test split).

### 8.2 Classifier Performance Benchmarks

| Model Classifier | 5-Fold CV Accuracy | CV Std Dev ($\sigma$) | Inference Speed (CPU) | Recommendation |
|---|---|---|---|---|
| **Support Vector Machine (RBF Kernel)** | **63.67%** | $\pm 4.36\%$ | **0.181 ms / sample** | **Selected Model** |
| **Random Forest (100 Trees)** | 59.32% | $\pm 2.30\%$ | 0.110 ms / sample | Secondary Baseline |
| **Logistic Regression** | 52.13% | $\pm 4.01\%$ | 0.004 ms / sample | Linear Baseline |

---

## 9. Backend API & Genuine Real-Time WebSocket Architecture

Implemented in **FastAPI** (`backend/app/main.py`) with support for genuine client landmark WebSocket streaming:

### 9.1 API Endpoints
- `GET /`: Health check endpoint returning system status and version metadata.
- `GET /camera-status`: Scans video devices 0..3 via `backend/app/camera/availability.py` and returns active camera device capabilities.
- `WebSocket /ws/posture`: Bi-directional real-time streaming connection. Receives live 3D MediaPipe landmark keypoints from the browser video stream and returns genuine calculated feature angles and ML model predictions every ~100--200ms.

---

## 10. Frontend Dashboard Architecture & Interactive Alerts

Built using **React 18 + Vite** with Tailwind CSS v3 and Recharts for real-time visualization:

### 10.1 Key Frontend Modules
- **`components/CameraCard.jsx`:** 3-camera preview card grid with HTML5 canvas glowing MediaPipe 3D pose skeleton overlays (**Green `#10b981`** for Good posture, **Red `#ef4444`** for Bad posture).
- **`components/SessionSummary.jsx`:** Renders live session duration timer (HH:MM:SS), Posture Health Score (0--100%), bad posture instance counter, and top posture risk badge.
- **`components/BadPostureModal.jsx`:** Interactive warning popup modal triggering when `posture_quality` stays `bad` for $> 30$ seconds continuously.
- **`components/Header.jsx`:** Master control header bar with global Start/Stop toggle, camera rescan button, and togglable **Audio Sitting Alert (60s)** and **Visual Alert (30s)** buttons.
- **`components/CameraStatus.jsx`:** Renders active camera counts, dynamic degradation mode badges (`Full 3-Camera` vs `Partial` vs `Single-Camera`), and contributing camera tags.
- **`components/PostureLiveView.jsx`:** Main posture status card displaying technical `posture_label`, binary `posture_quality` badges (`GOOD` vs `BAD`), confidence scores, decision layer tags, and live feature values (`torso_lateral_lean_angle`, `shoulder_tilt_angle`).
- **`components/AlertBanner.jsx`:** Highlights ergonomic risk warnings during sustained posture misalignments.
- **`components/PostureHistoryChart.jsx`:** Real-time Recharts area chart plotting torso lean angle and shoulder tilt trends over time.

---

## 11. Project Directory Structure

```
posture-detection-system/
├── backend/
│   └── app/
│       ├── main.py                     # FastAPI server entrypoint & WebSocket /ws/posture
│       ├── camera/                     # Hardware camera discovery & capture manager
│       │   ├── availability.py
│       │   └── capture.py
│       ├── pose/                       # MediaPipe landmark & feature extraction module
│       │   └── mediapipe_extractor.py
│       ├── models/                     # Trained .pkl models & scalers
│       │   ├── front_model.pkl
│       │   └── front_scaler.pkl
│       └── inference/                  # Rule engine & fusion logic
│           ├── rule_engine.py
│           ├── predictor.py
│           └── fusion_logic.py
├── frontend/
│   ├── package.json                    # React dashboard dependencies
│   ├── vite.config.js                  # Vite bundler configuration
│   ├── postcss.config.js               # PostCSS Tailwind v3 plugin setup
│   ├── tailwind.config.js              # Tailwind content scanner configuration
│   └── src/
│       ├── components/                 # UI cards, banners, charts, and modals
│       │   ├── CameraCard.jsx
│       │   ├── Header.jsx
│       │   ├── InfoBanner.jsx
│       │   ├── SessionSummary.jsx
│       │   ├── BadPostureModal.jsx
│       │   ├── CameraStatus.jsx
│       │   ├── PostureLiveView.jsx
│       │   ├── AlertBanner.jsx
│       │   └── PostureHistoryChart.jsx
│       ├── pages/                      # Main dashboard page
│       │   └── Dashboard.jsx
│       ├── services/                   # WebSocket client service
│       │   └── websocketClient.js
│       └── App.jsx
├── ml-training/
│   ├── build_master_dataset.py         # Raw parsing & session subsampling
│   ├── build_features_front.py         # Front feature calculation
│   ├── inspect_landmarks_and_depth.py  # Landmark verification script
│   ├── eda_quality_check.py            # Summary stats & boxplot generator
│   ├── train_front_model.py            # GroupKFold training & grid search
│   ├── notebooks/
│   │   └── eda_features_front.ipynb    # Executed Jupyter EDA notebook
│   └── saved_models/                   # Backup exported model binaries
├── dataset/
│   ├── master_dataset.csv              # Single source of truth dataset
│   ├── features/
│   │   └── features_front.csv          # Front feature dataset matrix
│   ├── eda_plots/                      # Exported boxplots & depth figures
│   └── README.md                       # Dataset guidelines
├── docs/
│   └── REPORT.md                       # Technical documentation
├── Untracked/
│   └── UPDATES.md                      # Project development log
│   └── INSTRUCTIONS.md                 # Agent instructions & preferences
├── .gitignore                          # Git repository exclusion rules
└── README.md                           # Main repository overview
```
