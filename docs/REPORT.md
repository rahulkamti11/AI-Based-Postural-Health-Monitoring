# Technical Documentation: AI-Based Sitting Posture Detection and Postural Health Monitoring System

## 1. Executive Summary

This document provides technical documentation for the **AI-Based Sitting Posture Detection and Postural Health Monitoring System**, an IEEE-targeted computer vision and machine learning platform designed for real-time ergonomic monitoring. The system analyzes upper-body pose keypoints captured via standard RGB camera streams, computes geometric spatial relationships, and applies a hybrid inference engine—combining deterministic clinical rule thresholds with trained classical machine learning classifiers—to identify spinal misalignment and ergonomic hazards.

Phase 1 focuses on building a robust front-camera detection pipeline using pre-extracted MediaPipe Pose landmark datasets (MultiPosture Zenodo dataset), establishing a single source of truth dataset schema, de-duplicating continuous held-posture frames, benchmarking classical classifiers, and implementing a multi-camera graceful degradation fusion engine.

---

## 2. System Architecture

The software architecture follows a decoupled, modular design divided into three primary layers:

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND LAYER                                    |
|              React (Vite) Dashboard + Tailwind CSS + Recharts Visualization        |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | WebSocket Stream (/ws/posture)
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
                                         ^
                                         | RGB Frame Buffer
                                         v
+-----------------------------------------------------------------------------------+
|                              POSE ESTIMATION LAYER                                |
|         MediaPipe Pose Pipeline (33 3D Keypoints per Frame @ CPU Inference)      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Posture Labeling & Two-Tier Classification Scheme

The system enforces a two-tier labeling scheme:
1. **Technical `posture_label` (6 Classes):** Fine-grained clinical classifications used for ML model training and targeted ergonomic feedback.
2. **Derived `posture_quality` (`good` / `bad`):** A top-level binary indicator automatically calculated via the rule:
   $$\text{posture\_quality} = \begin{cases} \text{good}, & \text{if } \text{posture\_label} = \text{neutral\_spinal\_alignment} \\ \text{bad}, & \text{otherwise} \end{cases}$$

### Class Definitions & Clinical Health Risk Mapping

| Technical `posture_label` | `posture_quality` | Detection View | Ergonomic Health Risk & Literature Backing |
|---|---|---|---|
| `neutral_spinal_alignment` | `good` | Front + Side | Balanced spine alignment; minimal muscular strain. |
| `thoracic_kyphotic_slouch` | `bad` | Side | Increased intervertebral disc pressure; elevated risk of lumbar disc herniation over prolonged sitting. |
| `cervical_forward_head_posture` | `bad` | Side | Strains cervical extensor musculature; directly associated with elevated neck pain severity (CVA $< 48\text{--}50^\circ$). |
| `lateral_trunk_tilt_left` | `bad` | Front | Asymmetric coronal loading; uneven muscular fatigue across left shoulder/torso. |
| `lateral_trunk_tilt_right` | `bad` | Front | Asymmetric coronal loading; uneven muscular fatigue across right shoulder/torso. |
| `posterior_trunk_recline` | `bad` | Side | Excessive backward lean without lumbar support; linked to reduced natural lumbar lordosis. |

---

## 4. Multi-Camera Hardware Setup & Graceful Degradation Strategy

### Camera Setup
- **Front Camera:** Built-in laptop webcam or smartphone (coronal plane view).
- **Left Camera:** Smartphone via WiFi webcam stream (sagittal plane view).
- **Right Camera:** Smartphone via WiFi webcam stream (sagittal plane view).

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
3. **Result:** Reduced dataset size from **4,794** to **1,029** clean frames (**78.54% redundancy reduction**), while maintaining exact relative class distributions:

| `posture_label` | Raw Frame Count | Subsampled Count ($N=5$) | Retained Percentage |
|---|---|---|---|
| `thoracic_kyphotic_slouch` | 1,897 | 396 | 20.87% |
| `neutral_spinal_alignment` | 1,615 | 337 | 20.87% |
| `posterior_trunk_recline` | 442 | 102 | 23.08% |
| `lateral_trunk_tilt_left` | 420 | 97 | 23.10% |
| `lateral_trunk_tilt_right` | 420 | 97 | 23.10% |
| **Total** | **4,794** | **1,029** | **21.46%** |

---

## 6. Feature Engineering Geometry & Formulas

From the master landmark dataset, 4 core front geometric features are calculated per frame:

1. **Shoulder Tilt Angle (`shoulder_tilt_angle`):**
   Angle between the line connecting left and right shoulder landmarks and the horizontal axis:
   $$\theta_{\text{shoulder}} = \text{atan2}(y_{\text{right\_shoulder}} - y_{\text{left\_shoulder}}, x_{\text{right\_shoulder}} - x_{\text{left\_shoulder}}) \times \frac{180}{\pi}$$

2. **Shoulder Symmetry Ratio (`shoulder_symmetry_ratio`):**
   Ratio of 3D Euclidean distance from nose to left shoulder versus nose to right shoulder:
   $$R_{\text{symmetry}} = \frac{d(\text{nose}, \text{left\_shoulder})}{d(\text{nose}, \text{right\_shoulder}) + \epsilon}$$

3. **Head Lateral Offset (`head_lateral_offset`):**
   Horizontal offset between nose $x$-coordinate and the mid-point of left and right shoulders:
   $$\Delta x_{\text{head}} = x_{\text{nose}} - \frac{x_{\text{left\_shoulder}} + x_{\text{right\_shoulder}}}{2}$$

4. **Torso Lateral Lean Angle (`torso_lateral_lean_angle`):**
   Angle formed between the vector connecting hip midpoint to shoulder midpoint and the vertical axis in the coronal ($x$-$y$) plane:
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
To prevent person-level data leakage, validation is performed using **5-Fold GroupKFold Cross-Validation** grouped strictly by `subject_id` (13 subjects total; 10 subjects in train split, 3 subjects in test split).

### 8.2 Classifier Performance Benchmarks

| Model Classifier | 5-Fold CV Accuracy | CV Std Dev ($\sigma$) | Inference Speed (CPU) | Recommendation |
|---|---|---|---|---|
| **Support Vector Machine (RBF Kernel)** | **63.67%** | $\pm 4.36\%$ | **0.181 ms / sample** | **Selected Model** |
| **Random Forest (100 Trees)** | 59.32% | $\pm 2.30\%$ | 0.110 ms / sample | Secondary Baseline |
| **Logistic Regression** | 52.13% | $\pm 4.01\%$ | 0.004 ms / sample | Linear Baseline |

### 8.3 Hyperparameter Tuning & Test Performance
- **GridSearchCV Optimization:** Tuned RBF SVM parameters to $C = 10.0$ and $\gamma = 0.1$, increasing cross-validation accuracy to **66.82%**.
- **Held-Out Test Set Results (Subjects 1, 10, 12):**
  - `lateral_trunk_tilt_left`: Precision = **0.92**, Recall = **0.81**, F1 = **0.86**
  - `lateral_trunk_tilt_right`: Precision = **0.96**, Recall = **0.89**, F1 = **0.92**
  - Overall Test Set Macro F1: **0.6338**

---

## 9. Backend API & Real-Time WebSocket Architecture

The backend layer is implemented in **FastAPI** (`backend/app/main.py`) with support for real-time WebSocket client streaming:

### 9.1 API Endpoints
- `GET /`: Health check endpoint returning system status and version metadata.
- `GET /camera-status`: Scans video devices 0..3 via `backend/app/camera/availability.py` and returns active camera device capabilities.
- `WebSocket /ws/posture`: Real-time streaming connection pushing JSON posture analysis payloads every ~200ms (~5 FPS).

### 9.2 Real-Time WebSocket Payload Schema
```json
{
  "posture_label": "lateral_trunk_tilt_left",
  "posture_quality": "bad",
  "confidence": 0.95,
  "decided_by": "rule_engine",
  "rule_triggered": "Empirical torso_lateral_lean_angle > 15.0°",
  "analysis_mode": "Single-Camera Analysis (Front-View)",
  "contributing_cameras": ["front"],
  "features": {
    "shoulder_tilt_angle": -150.56,
    "shoulder_symmetry_ratio": 1.15,
    "head_lateral_offset": 0.045,
    "torso_lateral_lean_angle": 36.94
  },
  "health_message": "Asymmetric loading strains shoulder and neck muscles unevenly.",
  "timestamp": 1756080000.123
}
```

---

## 10. Project Directory Structure

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
│   └── src/
│       ├── components/                 # UI cards, banners, and charts
│       ├── pages/                      # Main dashboard page
│       └── services/                   # WebSocket client service
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
