<div align="center">
  <h1>🤖 AI-Based Sitting Posture Detection & Postural Health Monitoring Platform</h1>
  <p><strong>A Real-Time, Multi-Camera, Privacy-Preserving Ergonomics System</strong></p>
</div>

<br>

## 📖 Project Overview
This project delivers a real-time, privacy-preserving, Multi-Camera Artificial Intelligence system to monitor sitting ergonomics. It leverages **MediaPipe** for local 3D skeleton extraction directly in the browser (reducing network bandwidth to near zero), and a **FastAPI Machine Learning Backend** to enforce clinical biomechanical thresholds and classify specific postural defects using trained **Random Forest** models.

---

## 🏛️ System Architecture & Multi-Camera Fallback
The system utilizes a **Graceful Degradation Multi-Camera Architecture**. A single camera cannot mathematically capture all posture defects (e.g., a 2D front webcam cannot measure Z-axis spine curvature). 
To solve this, the pipeline is divided into camera-specific independent expert models:

1. **Front Camera Inference (Coronal Plane)**
   - Physically capable of detecting left/right imbalances.
   - **Target Labels:** `asymmetricalLean` vs `normal`.
2. **Side Camera Inference (Sagittal Plane)**
   - Physically capable of detecting forward/backward spinal curves.
   - **Target Labels:** `forwardHead` (Text Neck), `slouch` (Kyphosis), `slidingDown` (Posterior Tilt) vs `normal`.

**Rule Engine Coordination (Backend):**
The backend aggregates available data streams. If multiple cameras are active, it calculates features for each and runs respective models. If any camera detects a defect, an overall `bad` quality alert is triggered. If only one camera is connected (e.g., just a laptop webcam), it gracefully falls back to monitoring only the defects visible to that single camera.

---

## 📊 Machine Learning Benchmarks & Validation
Models were trained using Python `scikit-learn` on engineered numerical clinical angles (e.g. CVA, Torso Lean, Shoulder Tilt) derived from a pristine synthetic 240-image multi-angle dataset.

| Classifier Model | Camera Target | Validation Accuracy | Inference Mechanism |
|---|---|---|---|
| **Random Forest** | **Front Camera** | **100.00%** | `asymmetricalLean` vs `normal` |
| **Random Forest** | **Side Camera(s)** | **81.25%** | `forwardHead`, `slouch`, `slidingDown` vs `normal` |

---

## 📁 Repository Directory Structure

```text
AI-Based-Postural-Health-Monitoring/
├── backend/                            # FastAPI Server & Python Backend
│   ├── app/
│   │   ├── main.py                     # Server entrypoint & WebSocket /ws/posture stream
│   │   ├── camera/                     # Hardware camera discovery & capture manager
│   │   ├── pose/                       # MediaPipe landmark & exact math feature extractor
│   │   │   └── mediapipe_extractor.py
│   │   └── inference/                  # Live ML Inference Engine & Fallback logic
│   │       └── binary_logic.py
│   └── requirements.txt                # Python backend dependencies
├── frontend/                           # React 18 + Vite Dashboard Application
│   ├── src/
│   │   ├── components/                 # React UI Cards & Alert Modals
│   │   │   ├── CameraCard.jsx          # 3-Camera preview grid & MediaPipe skeleton overlay
│   │   │   ├── Header.jsx              # Master controls & alert toggles
│   │   │   ├── SessionSummary.jsx      # Live duration, health score, & stats
│   │   │   ├── BadPostureModal.jsx     # 30s bad posture warning popup modal
│   │   │   ├── PostureLiveView.jsx     # Live posture status & metric tiles
│   │   │   └── PostureHistoryChart.jsx # Recharts real-time trend area graph
│   │   ├── pages/
│   │   │   └── Dashboard.jsx           # Main unified dashboard page
│   │   └── services/
│   │       └── websocketClient.js      # WebSocket client sending lightweight landmarks
│   ├── package.json
│   └── tailwind.config.js              # Tailwind CSS v3 configuration
├── ml-training/                        # Dataset Pipeline & Training Scripts
│   ├── build_features.py               # Math engine generating features_front.csv & features_side.csv
│   ├── train_models.py                 # RF & SVM Model training and benchmarking
│   ├── create_simple_plots.py          # EDA Plot generator (Bar & Scatter)
│   └── saved_models/                   # Active Champion Models
│       ├── front_model.pkl
│       └── side_model.pkl
├── dataset/                            # Dataset & Plot Storage
│   ├── master_dataset.csv              # Raw MediaPipe landmarks
│   ├── features_front.csv              # Front ML dataset (80 rows)
│   ├── features_side.csv               # Side ML dataset (160 rows)
│   └── eda_plots/                      # Exploratory Data Analysis PNGs
├── docs/
│   └── REPORT.md                       # Formal human-authored technical report
└── README.md                           # Comprehensive project overview
```

---

## 🚀 Quickstart & Installation Guide

### Prerequisites
- **Python:** `3.10` - `3.12`
- **Node.js:** `v18.0.0` or higher

### Step 1: Clone the Repository
```bash
git clone https://github.com/rahulkamti11/AI-Based-Postural-Health-Monitoring.git
cd AI-Based-Postural-Health-Monitoring
```

### Step 2: Set Up & Launch Python FastAPI Backend
**On Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**On macOS / Linux (Terminal):**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```
> The FastAPI backend server will start at `http://127.0.0.1:8000` with live WebSocket streaming at `ws://localhost:8000/ws/posture`.

### Step 3: Set Up & Launch React Frontend Dashboard
Open a **new terminal window** and run:
```bash
cd frontend
npm install
npm run dev
```
> Open your browser and navigate to `http://localhost:5173` to access the live dashboard.

---

## 📡 WebSocket API Payload Specification

### Client Keypoint Request (`Client -> Server @ ws://localhost:8000/ws/posture`):
```json
{
  "type": "landmarks",
  "camera_id": "front",
  "landmarks": {
    "nose": { "x": 0.512, "y": 0.324, "z": -0.150, "visibility": 0.99 },
    "left_shoulder": { "x": 0.620, "y": 0.480, "z": -0.050, "visibility": 0.98 }
  }
}
```

### Server ML Prediction Response (`Server -> Client`):
```json
{
  "overall_quality": "bad",
  "quality_confidence": 0.95,
  "decided_by": "ML_ENSEMBLE",
  "active_cameras": ["front", "left"],
  "posture_label": "asymmetricalLean",
  "feedback": {
    "alert_level": "WARNING",
    "message": "Asymmetrical leaning detected! Balance your shoulders."
  },
  "features_used": {
    "front": {
      "shoulder_tilt_angle": 19.3,
      "torso_lateral_lean_angle": 15.2
    }
  },
  "timestamp": 1756080000.200
}
```
