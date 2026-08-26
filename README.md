<div align="center">

# 🪑 AI-Based Sitting Posture Detection & Postural Health Monitoring System

### *IEEE Technical Standard Multi-Camera Vision & Hybrid ML-Rule Inference Platform*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10-00C0FF?style=for-the-badge&logo=google&logoColor=white)](https://mediapipe.dev/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Executive Summary

The **AI-Based Sitting Posture Detection and Postural Health Monitoring System** is an end-to-end computer vision and machine learning platform engineered to address workplace ergonomics, spinal misalignment, and sedentary health risks. Designed for multi-camera environments, the system analyzes human body spatial orientation in real-time, extracts 33 3D skeletal pose keypoints, computes 3D geometric spatial features, and executes a **hybrid inference engine** combining clinical rule cutoffs with trained classical machine learning classifiers.

> [!IMPORTANT]
> **Key Innovation:** Unlike traditional single-view posture trackers that fail when a user turns or obscures their camera, this system features a **Graceful Degradation Multi-Camera Fusion Engine** (Front Coronal + Left/Right Sagittal Views) that seamlessly adapts inference confidence and model weighting based on active camera feeds.

---

## ✨ Key System Capabilities

<table>
  <tr>
    <td width="50%">
      <h3>🎥 Multi-Camera WebRTC Grid</h3>
      <ul>
        <li><b>3 Video Viewports:</b> Front View (Laptop Webcam) + Left/Right Side Views (Smartphones via Iriun/DroidCam).</li>
        <li><b>Smart Hardware Auto-Mapping:</b> Automatically detects and maps built-in vs virtual USB/WiFi webcams.</li>
        <li><b>Live Controls:</b> Independent feed power (ON/OFF), mirror flip, crop/fill aspect ratio, and FPS counters.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🧠 Hybrid Rule-ML Inference Engine</h3>
      <ul>
        <li><b>Clinical Rule Engine:</b> Enforces Craniovertebral Angle (CVA $< 48^\circ$) and empirical lateral lean cutoffs ($> 15^\circ$).</li>
        <li><b>Trained RBF SVM Model:</b> Optimized Support Vector Machine ($C=10.0, \gamma=0.1$) trained via GroupKFold CV.</li>
        <li><b>Sub-Millisecond Speed:</b> CPU inference latency of <b>0.181 ms / sample</b>.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🟢🔴 Dynamic Pose Overlay Coloring</h3>
      <ul>
        <li><b>Good Posture:</b> Glowing skeletal connector lines and keypoint joint nodes render in <b>Emerald Green</b> (<code>#10b981</code>).</li>
        <li><b>Bad Posture:</b> Overlay dynamically shifts to <b>Rose Red</b> (<code>#ef4444</code>) upon detecting misalignment.</li>
        <li><b>Toggleable Rendering:</b> One-click skeleton visibility toggle.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🔔 Session Analytics & Togglable Alerts</h3>
      <ul>
        <li><b>Session Summary:</b> Live duration timer, Posture Health Score (0–100%), and bad posture instance counters.</li>
        <li><b>Audio Sitting Chime (> 60s):</b> Plays soft Web Audio chime when sitting continuously past 1 minute.</li>
        <li><b>Visual Popup Modal (> 30s):</b> Interactive warning popup with corrective ergonomic guidance.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture & Data Flow Pipeline

The platform follows a clean decoupled microservices architecture connecting browser WebRTC video streams to Python FastAPI machine learning services over high-performance WebSockets:

```text
+-----------------------------------------------------------------------------------+
|                                 FRONTEND LAYER                                    |
|              React (Vite) Dashboard + Tailwind CSS + Recharts Visualization        |
|  +-----------------------------------------------------------------------------+  |
|  | WebRTC Video Capture -> MediaPipe JS Keypoint Extractor -> WebSocket Client  |  |
|  |  CameraCard.jsx | SessionSummary.jsx | BadPostureModal.jsx | AlertBanner.jsx  |  |
|  |  PostureLiveView.jsx | CameraStatus.jsx | PostureHistoryChart.jsx           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         │
                                         │ Live 3D Landmark JSON (Client -> Server @ 10 FPS)
                                         │ Fused Prediction JSON (Server -> Client @ 10 FPS)
                                         ▼
+-----------------------------------------------------------------------------------+
|                                 BACKEND LAYER                                     |
|                       FastAPI Server (Python 3.12)                                |
|  +-----------------------------------------------------------------------------+  |
|  |                            Inference Engine                                 |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  |  |   Rule Engine Evaluator   | ----> | ML Classifier Fallback (SVM RBF)  |  |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  |                                  │                                          |  |
|  |                                  ▼                                          |  |
|  |                     Weighted Camera Fusion Engine                           |  |
|  |       (Front: 1.2, Left: 1.0, Right: 1.0) + Degradation Mode Tracker       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 🏷️ Posture Classification & Ergonomic Mapping

The system enforces a **two-tier classification scheme**:
$$\text{posture\_quality} = \begin{cases} \text{good}, & \text{if } \text{posture\_label} = \text{neutral\_spinal\_alignment} \\ \text{bad}, & \text{otherwise} \end{cases}$$

| Technical `posture_label` | `posture_quality` | Detection View | Skeleton Color | Ergonomic Health Risk & Medical Context |
|---|---|---|---|---|
| `neutral_spinal_alignment` | `good` | Front + Side | 🟢 **Green (`#10b981`)** | Balanced spine alignment; minimal muscular strain. |
| `thoracic_kyphotic_slouch` | `bad` | Side | 🔴 **Red (`#ef4444`)** | Increased intervertebral disc pressure; elevated risk of lumbar herniation. |
| `cervical_forward_head_posture` | `bad` | Side | 🔴 **Red (`#ef4444`)** | Strains cervical extensor muscles; directly linked to neck pain severity (CVA $< 48^\circ$). |
| `lateral_trunk_tilt_left` | `bad` | Front | 🔴 **Red (`#ef4444`)** | Asymmetric coronal loading; uneven muscular fatigue across left shoulder/torso. |
| `lateral_trunk_tilt_right` | `bad` | Front | 🔴 **Red (`#ef4444`)** | Asymmetric coronal loading; uneven muscular fatigue across right shoulder/torso. |
| `posterior_trunk_recline` | `bad` | Side | 🔴 **Red (`#ef4444`)** | Excessive backward lean without lumbar support; reduces natural lumbar curve. |

---

## 📐 Geometric Feature Engineering

From 33 extracted MediaPipe 3D pose landmarks $(x, y, z)$, 4 core coronal geometric features are computed per frame:

1. **Torso Lateral Lean Angle ($\theta_{\text{torso}}$):**
   $$\theta_{\text{torso}} = \text{atan2}(x_{\text{shoulder\_mid}} - x_{\text{hip\_mid}}, -(y_{\text{shoulder\_mid}} - y_{\text{hip\_mid}})) \times \frac{180}{\pi}$$

2. **Shoulder Tilt Angle ($\theta_{\text{shoulder}}$):**
   $$\theta_{\text{shoulder}} = \text{atan2}(y_{\text{right\_shoulder}} - y_{\text{left\_shoulder}}, x_{\text{right\_shoulder}} - x_{\text{left\_shoulder}}) \times \frac{180}{\pi}$$

3. **Shoulder Symmetry Ratio ($R_{\text{symmetry}}$):**
   $$R_{\text{symmetry}} = \frac{d(\text{nose}, \text{left\_shoulder})}{d(\text{nose}, \text{right\_shoulder}) + \epsilon}$$

4. **Head Lateral Offset ($\Delta x_{\text{head}}$):**
   $$\Delta x_{\text{head}} = x_{\text{nose}} - \frac{x_{\text{left\_shoulder}} + x_{\text{right\_shoulder}}}{2}$$

---

## 📊 Machine Learning Benchmarking & Validation

Training was conducted on the **MultiPosture Zenodo Dataset** (Record `14230872`, 4,794 raw frames reduced to **1,029 subsampled frames** via session-based $N=5$ endpoint-preserving de-duplication). Models were validated using **5-Fold GroupKFold Cross-Validation** grouped strictly by subject ID (13 subjects) to eliminate data leakage:

| Classifier Model | Hyperparameters | 5-Fold CV Accuracy | Latency (CPU) | Status |
|---|---|---|---|---|
| **Support Vector Machine (SVM)** | **RBF Kernel ($C=10.0, \gamma=0.1$)** | **66.82%** | **0.181 ms** | **Selected Model** |
| Random Forest | 100 Trees (`max_depth=10`) | 59.32% | 0.110 ms | Baseline |
| Logistic Regression | L2 Regularization ($C=1.0$) | 52.13% | 0.004 ms | Baseline |

---

## 📁 Repository Directory Structure

```
AI-Based-Postural-Health-Monitoring/
├── backend/                            # FastAPI Server & Python Backend
│   └── app/
│       ├── main.py                     # Server entrypoint & WebSocket /ws/posture stream
│       ├── camera/                     # Hardware camera discovery & capture manager
│       │   ├── availability.py
│       │   └── capture.py
│       ├── pose/                       # MediaPipe landmark & feature extractor
│       │   └── mediapipe_extractor.py
│       ├── models/                     # Trained ML models (.pkl) & scalers
│       │   ├── front_model.pkl
│       │   └── front_scaler.pkl
│       └── inference/                  # CVA Rule engine & weighted camera fusion
│           ├── rule_engine.py
│           └── fusion_logic.py
├── frontend/                           # React + Vite Dashboard Application
│   ├── src/
│   │   ├── components/                 # React UI Cards & Alert Modals
│   │   │   ├── CameraCard.jsx          # 3-Camera preview grid & skeleton overlay
│   │   │   ├── Header.jsx              # Master controls & alert toggles
│   │   │   ├── SessionSummary.jsx      # Live duration, health score, & stats
│   │   │   ├── BadPostureModal.jsx     # 30s bad posture warning popup modal
│   │   │   ├── PostureLiveView.jsx     # Live posture status & metric tiles
│   │   │   ├── PostureHistoryChart.jsx # Recharts real-time trend area graph
│   │   │   └── AlertBanner.jsx         # Clinical health risk warnings
│   │   ├── pages/
│   │   │   └── Dashboard.jsx           # Main unified dashboard page
│   │   └── services/
│   │       └── websocketClient.js      # WebSocket client with keypoint streaming
│   ├── package.json
│   ├── tailwind.config.js              # Tailwind CSS v3 configuration
│   └── vite.config.js
├── ml-training/                        # Dataset Pipeline & Training Notebooks
│   ├── build_master_dataset.py         # Raw parsing & session subsampling (N=5)
│   ├── build_features_front.py         # 4-front feature matrix generator
│   ├── train_front_model.py            # GroupKFold CV & grid search optimization
│   └── notebooks/
│       └── eda_features_front.ipynb    # Jupyter EDA notebook with feature plots
├── dataset/                            # Dataset & Plot Storage
│   ├── master_dataset.csv
│   └── features/
│       └── features_front.csv
├── docs/
│   └── REPORT.md                       # Formal human-authored technical report
└── README.md                           # Comprehensive project overview
```

---

## ⚡ Quickstart & Installation Guide

### Prerequisites
- **Python:** `3.12` or higher
- **Node.js:** `v18.0.0` or higher
- **npm:** `v9.0.0` or higher

### 1. Backend Setup & Server Launch

```powershell
# Navigate to workspace root
cd "d:\Rahul\9.Projects\7. 7th sem Minor Project\project"

# Activate Python virtual environment
.\.venv\Scripts\Activate.ps1

# Navigate to backend directory
cd backend

# Start FastAPI Uvicorn WebSocket Server
python -m uvicorn app.main:app --reload --port 8000
```
> Server will start at `http://127.0.0.1:8000` with WebSocket endpoint `ws://localhost:8000/ws/posture`.

### 2. Frontend React Dashboard Launch

```powershell
# Open a second terminal and navigate to frontend directory
cd "d:\Rahul\9.Projects\7. 7th sem Minor Project\project\frontend"

# Install dependencies (if not already installed)
npm install

# Start Vite Development Server
npm run dev
```
> Access the interactive dashboard at `http://localhost:5173`.

---

## 🔌 WebSocket API Payload Specification

### Client Keypoint Request (`Client -> Server @ ws://localhost:8000/ws/posture`):
```json
{
  "type": "landmarks",
  "camera_id": "front",
  "landmarks": {
    "nose": { "x": 0.512, "y": 0.324, "z": -0.150, "visibility": 0.99 },
    "left_shoulder": { "x": 0.620, "y": 0.480, "z": -0.050, "visibility": 0.98 },
    "right_shoulder": { "x": 0.404, "y": 0.475, "z": -0.045, "visibility": 0.98 }
  },
  "timestamp": 1756080000.123
}
```

### Server Prediction Response (`Server -> Client`):
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
  "timestamp": 1756080000.200
}
```

---

## 📄 License & Dataset Citation

This project is developed under the **MIT License**. The underlying training datasets originate from:
- **MultiPosture Dataset:** Carneros-Prado et al., 2024 (Zenodo Record `14230872`), licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).

---

<div align="center">

**Developed for IEEE Minor Project Evaluation • AIML Department**

</div>
