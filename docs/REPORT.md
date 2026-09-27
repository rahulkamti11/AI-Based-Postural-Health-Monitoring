# Technical Report: AI-Based Sitting Posture Detection and Postural Health Monitoring System

## 1. Project Overview
This project delivers a real-time, privacy-preserving, Multi-Camera Artificial Intelligence system to monitor sitting ergonomics. It leverages **MediaPipe** for local 3D skeleton extraction in the browser, reducing bandwidth to near zero, and a **FastAPI Machine Learning Backend** to enforce clinical biomechanical thresholds and classify specific postural defects using Random Forest models.

---

## 2. System Architecture & Multi-Camera Fallback

The system utilizes a **Graceful Degradation Multi-Camera Architecture**. A single camera cannot mathematically capture all posture defects (e.g., a 2D front webcam cannot measure Z-axis spine curvature). 
To solve this, the pipeline is divided into camera-specific independent expert models:

1. **Front Camera Inference (Coronal Plane)**
   - Physically capable of detecting left/right imbalances.
   - **Target Labels:** symmetricalLean vs 
ormal.
2. **Side Camera Inference (Sagittal Plane)**
   - Physically capable of detecting forward/backward spinal curves.
   - **Target Labels:** orwardHead (Text Neck), slouch (Kyphosis), slidingDown (Posterior Tilt) vs 
ormal.

**Rule Engine Coordination (Backend):**
The backend aggregates available data streams. If multiple cameras are active, it calculates features for each and runs respective models. If any camera detects a defect (e.g., Side detects orwardHead OR Front detects symmetricalLean), a ad overall quality alert is triggered. If only one camera is connected (e.g., just a laptop webcam), it gracefully falls back to monitoring only the defects visible to that single camera.

---

## 3. Dataset Generation & Standardization
Because high-quality medical multi-camera posture datasets are unavailable publicly, a multi-stage synthetic dataset was curated and expanded.

### Phase 1: Initial Dataset (5 Subjects)
- **Total Images:** 240 images (80 Front, 80 Left, 80 Right)
- **Class Balance:** 120 Good Posture vs 120 Bad Posture.

### Phase 2: Final Dataset (10 Subjects)
- **Total Images:** 360 images (120 Front, 120 Left, 120 Right)
- **Class Balance:** 120 Good Posture vs 240 Bad Posture.
- **Naming Convention:** `{subject}_{camera}_{quality}_{posture_label}_{variation}.jpg` (e.g., `subject04_front_bad_asymmetricalLean_var1.jpg`).

---

## 4. Mathematical Feature Engineering (Trigonometry)
Raw MediaPipe (X,Y,Z) coordinates are strictly converted into scale-invariant clinical angles before ML training.

### 4.1 Front Features (`features_front.csv`)
1. **Shoulder Tilt Angle:** Derived via `atan2` on Left/Right Shoulder Y-X deltas. 
2. **Torso Lateral Lean Angle:** Derived via `atan2` between the midpoint of shoulders and midpoint of hips.
3. **Head Lateral Offset:** X-axis deviation of the nose from the shoulder midpoint.
4. **Shoulder Symmetry Ratio:** Distance ratio from nose to left vs right shoulder.

### 4.2 Side Features (`features_side.csv`)
1. **Neck Angle (CVA Proxy):** Vertical angle between Shoulder and Ear.
2. **Torso Lean Angle:** Vertical angle between Hip and Shoulder.
3. **Spine Curve Angle:** Computed via dot product (Cosine rule) of vectors (Hip->Shoulder) and (Shoulder->Ear) to detect slouching.
4. **Head Forward Distance:** Normalized X-axis distance from ear to shoulder.

---

## 5. Machine Learning Benchmarks & Validation
Models were trained using Python `scikit-learn` on the engineered numerical features.

### 5.1 Front Model Evaluation (Asymmetrical Lean vs Normal)
- **Phase 1 (5 Subjects) Accuracy:** **100.00%** 
  - *Note:* Artificially high due to smaller sample size allowing the model to easily memorize distinct thresholds.
- **Phase 2 (10 Subjects) Accuracy:** **91.67%** (Champion: Random Forest)
  - *Note:* A highly robust, generalized model capable of identifying diverse body builds accurately. Achieved 100% recall on Asymmetrical Lean.

### 5.2 Side Model Evaluation (Forward Head, Slouch, Sliding Down vs Normal)
- **Phase 1 (5 Subjects) Accuracy:** **81.25%**
- **Phase 2 (10 Subjects) Accuracy:** **72.92%** (Champion: Random Forest)
  - *Analysis:* Increased dataset diversity introduced necessary complexity. The model achieved 84% F1-Score on Forward Head. Minor confusion occurred between `slouch` and `slidingDown` due to visual similarities in spinal curvature, which is mathematically expected from a 2D side view.
