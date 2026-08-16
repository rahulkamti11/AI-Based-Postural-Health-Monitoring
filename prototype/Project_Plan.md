# AI-Based Sitting Posture Detection and Postural Health Monitoring System
## Project Single Source of Truth (SSOT)

**Project status:** Planning / not yet implemented  
**Primary goal:** Build a local, real-time, multi-camera AI/ML system that detects sitting posture and monitors poor-posture duration, with a web-based dashboard for visualization and alerts.

---

## 1. Project Overview

### Project Title

**AI-Based Sitting Posture Detection and Postural Health Monitoring System**

### Core idea

The system will use webcam feeds to observe a seated person from multiple viewpoints. The laptop will perform all computer-vision and machine-learning processing locally.

The system will:

1. Capture live video from cameras.
2. Detect the human body using pose estimation.
3. Extract body landmarks.
4. Convert landmarks into meaningful posture-related numerical features.
5. Feed those features into a trained ML classifier.
6. Predict the current sitting posture.
7. Monitor how long poor posture continues.
8. Display processed camera feeds with skeleton overlays and predictions.
9. Show real-time statistics and alerts on a dashboard.

### Initial camera configuration

We will start with **two cameras**:

- **Camera 1:** approximately 45° front-side viewpoint, capturing a combination of front and side information.
- **Camera 2:** side viewpoint.

Later, the system will be extended to **three cameras**:

- **Camera 1:** front viewpoint.
- **Camera 2:** left-side viewpoint.
- **Camera 3:** right-side viewpoint.

The three-camera system is an extension of the two-camera system, not a requirement for the first working prototype.

---

# 2. Project Philosophy

This is the user's first AIML project. The system should therefore be built incrementally and explained at each stage.

The project will not begin by jumping directly into a large neural network.

The chosen approach is a **hybrid pose-estimation + feature-engineering + lightweight ML classifier** architecture.

The learning path should focus on concepts that are directly required for this project.

---

# 3. High-Level Architecture

## Initial two-camera architecture

```text
             CAMERA 1
          ~45° FRONT-SIDE
                 |
                 v
             OpenCV
                 |
                 v
          MediaPipe Pose
                 |
                 v
          Body Landmarks
                 |
                 v
        Feature Extraction
                 |
                 v
          Camera 1 Features
                 |
                 |
                 +------------------+
                                    |
                                    v
                              Feature Fusion
                                    ^
                                    |
                 +------------------+
                 |
          Camera 2 Features
                 ^
                 |
        Feature Extraction
                 ^
                 |
          Body Landmarks
                 ^
                 |
          MediaPipe Pose
                 ^
                 |
              OpenCV
                 ^
                 |
             CAMERA 2
             SIDE VIEW

                                    |
                                    v
                             ML Classifier
                                    |
                                    v
                           Final Posture Result
                                    |
                         +----------+----------+
                         |                     |
                         v                     v
                  Posture Detection     Health Monitoring
                         |                     |
                         |                     v
                         |              Duration Tracking
                         |                     |
                         |                     v
                         |                 Alerts
                         |
                         v
                    Dashboard
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
          Camera 1    Camera 2    Statistics
          Preview     Preview
          +           +
        Skeleton    Skeleton
        Overlay     Overlay
```

---

# 4. Hybrid AI/ML Approach

The system will use several distinct components. Each has a different responsibility.

## 4.1 MediaPipe Pose

MediaPipe Pose is a pretrained pose-estimation system.

Its job is to detect human body landmarks from an image/video frame.

It provides approximately **33 body landmarks**.

Examples include:

- nose
- eyes
- ears
- shoulders
- elbows
- wrists
- hips
- knees
- ankles

Each landmark contains coordinate information such as:

- x
- y
- z
- visibility

MediaPipe does **not** directly decide whether the person has good or bad posture.

Its role is:

```text
Image
  ↓
Human pose
  ↓
Body landmarks
```

---

## 4.2 Feature Engineering

Raw landmark coordinates are not directly the final posture representation.

Our Python code will convert relevant landmarks into meaningful numerical features.

Potential features include:

- neck angle
- shoulder angle / shoulder tilt
- torso angle
- head-forward displacement
- shoulder-to-hip alignment
- relative head position
- left/right asymmetry
- normalized distances
- other geometry-derived posture indicators

The exact final feature list will be determined experimentally after examining the landmark behavior from our two camera viewpoints.

Conceptually:

```text
33 landmarks
      ↓
Relevant landmarks
      ↓
Geometric calculations
      ↓
Posture features
```

---

## 4.3 Dataset

We will collect posture data ourselves rather than depending entirely on a generic posture dataset.

The dataset will contain posture-related features and their corresponding labels.

Conceptually, one row represents one observation:

```text
feature_1, feature_2, feature_3, ..., feature_N, label
```

Example:

```text
neck_angle, torso_angle, shoulder_tilt, head_offset, ..., posture
```

Possible initial posture classes:

1. **Good / Upright**
2. **Slouching / Hunched**
3. **Leaning Forward**

Additional classes may later be added, such as:

- leaning left
- leaning right
- forward-head posture

We will not unnecessarily increase the number of classes until the basic pipeline works reliably.

---

## 4.4 ML Classifier

The engineered features will be given to a lightweight supervised ML classifier.

Initial candidate models:

- Random Forest
- SVM

The model will learn patterns such as:

```text
Feature combination
        ↓
Posture class
```

Instead of hardcoding:

```text
IF angle > X:
    bad posture
```

the classifier learns the relationship from labeled examples.

This is the main machine-learning component of the project.

---

# 5. Why Hybrid Instead of Pure Rule-Based Detection?

## Rule-based approach

Example:

```text
IF torso_angle > threshold:
    posture = "bad"
```

### Advantages

- easy to implement
- no training dataset required
- highly explainable
- works quickly

### Disadvantages

- thresholds must be manually selected
- may not generalize well across people
- sensitive to camera position and body proportions
- weaker machine-learning component for an AIML project

## ML-based approach

```text
Landmarks
    ↓
Features
    ↓
Training dataset
    ↓
ML model
    ↓
Posture prediction
```

### Advantages

- learns patterns from data
- supports measurable training and testing
- allows accuracy/precision/recall/F1 evaluation
- stronger experimental component

### Disadvantages

- requires labeled data
- requires proper train/test methodology
- more components to debug

## Chosen solution

**Hybrid:**

```text
MediaPipe
   ↓
Feature Engineering
   ↓
Labeled Dataset
   ↓
Random Forest / SVM
   ↓
Posture Classification
```

This keeps the system computationally lightweight while providing a genuine ML component.

---

# 6. Development Phases

## Phase 0 — AIML Foundations

Before implementation, learn the minimum concepts required:

- AI
- Machine Learning
- Computer Vision
- Pose Estimation
- Dataset
- Features
- Labels
- Training
- Validation
- Testing
- Classification
- Model
- Prediction
- Overfitting
- Data leakage
- Accuracy
- Precision
- Recall
- F1-score
- Confusion matrix

The objective is not to study all of machine learning before starting the project.

Concepts will be learned as they become relevant.

---

# Phase 1 — MediaPipe and Pose Detection

### Goal

Get one camera working and visualize body landmarks.

Pipeline:

```text
Webcam
  ↓
OpenCV
  ↓
MediaPipe Pose
  ↓
Landmarks
  ↓
Skeleton overlay
```

Tasks:

1. Install Python environment.
2. Install required libraries.
3. Open webcam with OpenCV.
4. Capture frames.
5. Run pose estimation.
6. Extract landmarks.
7. Draw skeleton/landmark connections.
8. Display the processed video.
9. Understand landmark coordinates.

At this stage, there is no custom posture classifier yet.

---

# Phase 2 — Feature Engineering

### Goal

Convert pose landmarks into posture-related numerical features.

Tasks:

1. Identify relevant landmarks.
2. Understand x/y/z coordinates.
3. Implement geometric calculations.
4. Calculate angles.
5. Calculate relative distances.
6. Normalize features where appropriate.
7. Visualize feature values.
8. Determine which features are stable and useful.

Example:

```text
Landmarks
   ↓
Shoulder + hip + head positions
   ↓
Angles / distances
   ↓
Feature vector
```

The final feature list will be based on experiments rather than being arbitrarily fixed beforehand.

---

# Phase 3 — Dataset Creation

## Goal

Create a reliable labeled dataset for supervised learning.

### Initial posture classes

```text
Class 0 → Good / Upright
Class 1 → Slouching / Hunched
Class 2 → Leaning Forward
```

Potential future classes:

```text
Class 3 → Leaning Left
Class 4 → Leaning Right
Class 5 → Forward Head
```

### Data collection

We will collect data using the same camera configuration that the real system will use.

Initial setup:

```text
Camera 1 → ~45° front-side
Camera 2 → side
```

For each posture, record examples.

However, we should **not simply randomly split consecutive video frames into training and testing data**.

Consecutive frames are highly correlated. If frames from the same continuous recording appear in both training and testing sets, the model may appear much more accurate than it actually is.

### Preferred data collection strategy

Use separate sessions/segments.

For example:

```text
Session A
  Good
  Slouching
  Forward Lean

Session B
  Good
  Slouching
  Forward Lean

Session C
  Good
  Slouching
  Forward Lean
```

Testing should use observations from sessions that were not used for training.

If possible, testing on a different person is even stronger.

### Dataset fields

The final dataset may contain:

```text
timestamp
session_id
person_id
camera_id
feature_1
feature_2
...
feature_N
label
```

For a fused multi-camera model, a synchronized observation may instead contain:

```text
session_id
timestamp
camera_1_feature_1
camera_1_feature_2
...
camera_2_feature_1
camera_2_feature_2
...
label
```

The exact schema will be finalized after the feature set is established.

### Dataset quality requirements

We will try to include:

- multiple sessions
- different posture durations
- natural posture variation
- slight movement
- realistic sitting conditions
- consistent camera placement
- different people if available

We should avoid collecting only perfectly static poses.

---

# 7. Two-Camera Feature Fusion

The initial system will use two viewpoints.

## Camera 1

~45° front-side view.

Potentially useful for:

- shoulder alignment
- shoulder tilt
- head position
- left/right leaning
- general body alignment

## Camera 2

Side view.

Potentially useful for:

- forward head posture
- neck angle
- torso inclination
- slouching/hunching
- head-to-torso relationship

### Fusion

The features from both cameras can be combined:

```text
Camera 1 features
        +
Camera 2 features
        ↓
Combined feature vector
        ↓
ML classifier
        ↓
Final posture
```

The ML model can therefore learn from complementary viewpoints.

---

# 8. Phase 4 — Machine Learning

## Goal

Train a classifier that predicts posture from the engineered features.

### Training pipeline

```text
Dataset
   ↓
Clean/validate data
   ↓
Feature matrix X
   +
Labels y
   ↓
Train/validation/test split
   ↓
Train candidate models
   ↓
Evaluate
   ↓
Select model
   ↓
Save trained model
```

### Features and labels

Features:

```text
X = posture-related numerical measurements
```

Label:

```text
y = Good / Slouching / Forward Lean
```

### Candidate model 1: Random Forest

Random Forest consists of multiple decision trees.

Conceptually:

```text
Features
   ↓
Tree 1 ──┐
Tree 2 ──┤
Tree 3 ──┤
...      ├──→ Combined decision
Tree N ──┘
```

Advantages:

- easy to use
- handles nonlinear relationships
- works well with tabular features
- relatively robust
- provides feature importance
- does not require a GPU

### Candidate model 2: SVM

Support Vector Machine attempts to find boundaries separating classes.

Conceptually:

```text
Feature space
      ↓
Find decision boundary
      ↓
Separate posture classes
```

SVM can perform well on smaller, structured datasets.

### Model selection

We will not decide blindly that one model is better.

We can train both and compare them using the same evaluation protocol.

Potential criteria:

- accuracy
- precision
- recall
- F1-score
- confusion matrix
- inference speed
- consistency across sessions

The final model will be selected based on experimental results.

---

# 9. Training vs Real-Time Inference

These are separate processes.

## Training

Training happens during development.

```text
Dataset
   ↓
Feature matrix
   ↓
ML training
   ↓
Trained model
   ↓
Save model file
```

The trained model may be saved using `joblib`.

## Inference

During real-time use:

```text
Camera
   ↓
MediaPipe
   ↓
Features
   ↓
Saved ML model
   ↓
Prediction
```

The model is not retrained every frame.

It is trained beforehand and then reused.

---

# 10. Phase 5 — Real-Time System

## Goal

Turn the trained model into a continuously running posture-monitoring system.

### Per-camera processing

Each camera will follow:

```text
Camera
  ↓
Capture frame
  ↓
Pose estimation
  ↓
Landmarks
  ↓
Feature extraction
  ↓
ML prediction
  ↓
Draw skeleton
  ↓
Draw posture result
  ↓
Display frame
```

This happens continuously.

---

# 11. Dashboard

The dashboard will show both camera feeds and real-time results.

Initial concept:

```text
┌───────────────────────────────────────────────────────┐
│              AI POSTURE MONITOR                       │
├──────────────────────────┬────────────────────────────┤
│     CAMERA 1             │       CAMERA 2             │
│     ~45° VIEW            │       SIDE VIEW            │
│                          │                            │
│   [processed video]      │    [processed video]      │
│   skeleton overlay       │    skeleton overlay        │
│                          │                            │
│   Prediction: GOOD       │    Prediction: SLOUCHING   │
│   Confidence: 95%        │    Confidence: 92%         │
├──────────────────────────┴────────────────────────────┤
│                    OVERALL RESULT                      │
│                                                       │
│   Posture:          SLOUCHING                         │
│   Confidence:       94%                               │
│   Poor posture:     02:14                             │
│                                                       │
│   Good posture:     72%                               │
│   Poor posture:     28%                               │
│                                                       │
│          WARNING: CORRECT YOUR POSTURE                │
└───────────────────────────────────────────────────────┘
```

The dashboard will be implemented after the underlying camera/ML pipeline works.

---

# 12. Dashboard Technology

## Initial recommendation: Streamlit

Streamlit allows us to create the dashboard using Python.

Advantages:

- simple for an AIML project
- minimal frontend code
- fast prototyping
- easy local deployment
- good for displaying ML results

Possible future architecture:

```text
Python
   ↓
Streamlit
   ↓
Browser
   ↓
localhost
```

If a more polished production-style web application is required later, the dashboard could be migrated to:

```text
Python backend
   +
FastAPI / Flask
   +
HTML/CSS/JavaScript or React
```

This is not required for the initial AIML implementation.

---

# 13. Real-Time Posture Monitoring

ML classification answers:

> What posture is the person currently in?

The monitoring system answers:

> How long has the person remained in that posture?

These are separate layers.

Example:

```text
ML:
SLOUCHING
    ↓
Monitoring:
Start timer
    ↓
Still slouching?
    ↓
Yes
    ↓
2 minutes
    ↓
Alert
```

### Possible monitoring metrics

- current posture
- posture confidence
- good-posture duration
- poor-posture duration
- longest poor-posture period
- percentage of session spent in good posture
- percentage of session spent in poor posture
- number of posture warnings
- posture transitions

---

# 14. Alerts

Possible alert levels:

### Visual alert

```text
Poor posture detected
```

### Duration warning

```text
Poor posture duration: 02:15
```

### User warning

```text
Please correct your sitting posture.
```

### Audio alert

An optional audio notification can be added later.

Alerts should be designed to avoid repeated notifications every frame. The monitoring layer should use timing/state logic.

---

# 15. Prediction Smoothing

A real-time classifier may occasionally produce:

```text
Good
Good
Slouching
Good
Slouching
Slouching
Good
```

even when the person is essentially stationary.

We should therefore consider temporal smoothing.

Possible methods:

- majority vote over recent predictions
- confidence threshold
- moving window
- minimum duration before changing state

Example:

```text
Recent predictions:
Good
Good
Good
Slouching
Slouching

→ Smoothed result: Good
```

The exact method will be selected after observing real-time behavior.

---

# 16. Phase 6 — Evaluation

Evaluation is essential because a working demo alone does not establish model quality.

## Metrics

### Accuracy

Percentage of predictions that are correct.

Useful as a general measure, but not sufficient by itself.

### Precision

For a particular posture class:

> Of the samples predicted as this class, how many were actually that class?

### Recall

> Of the actual samples belonging to this class, how many did the model detect?

### F1-score

Combines precision and recall.

### Confusion matrix

Shows which posture classes are being confused.

Example:

```text
                 Predicted
              Good Slouch Forward
Actual Good    90     5       5
Actual Slouch   4    91       5
Actual Forward  6     7      87
```

This can reveal, for example, whether slouching and forward leaning are difficult to distinguish.

---

# 17. Correct Evaluation Methodology

A major project requirement is to avoid data leakage.

Bad approach:

```text
One 10-minute video
        ↓
Randomly split every frame
        ↓
80% training / 20% testing
```

This can produce overly optimistic results because neighboring frames are almost identical.

Better:

```text
Session A ── Training
Session B ── Training
Session C ── Validation
Session D ── Testing
```

Even better, if feasible:

```text
Person A → Training
Person B → Validation
Person C → Testing
```

This evaluates whether the model generalizes beyond the person it learned from.

The exact split will depend on how much data we can collect.

---

# 18. Evaluation Experiments

The project can eventually compare:

### Experiment 1 — Single camera

```text
One camera
   ↓
ML model
   ↓
Metrics
```

### Experiment 2 — Two cameras

```text
45° camera + side camera
   ↓
Feature fusion
   ↓
ML model
   ↓
Metrics
```

### Experiment 3 — Three cameras (future)

```text
Front + left + right
   ↓
Feature fusion
   ↓
ML model
   ↓
Metrics
```

This gives us an experimental question:

> Does adding additional viewpoints improve posture-classification performance?

This can become a valuable part of the project report.

---

# 19. Future Three-Camera Architecture

After the two-camera system is stable:

```text
                FRONT
                  |
                  v
                 👤
               /   \
              /     \
             v       v
           LEFT     RIGHT
```

Processing:

```text
Front features ──┐
Left features ───┼──→ Feature Fusion → ML → Final Posture
Right features ──┘
```

The three-camera system should be treated as an extension of the two-camera design.

We should not rebuild the entire project from scratch.

---

# 20. Hardware Requirements

## Initial two-camera setup

Required:

- laptop/PC
- 2 USB webcams
- suitable USB ports
- optional powered USB hub
- speakers/headphones if audio alerts are used

### Camera recommendations

Initial target:

- 720p or 1080p camera
- around 30 FPS
- USB connection
- stable fixed mounting

The cameras do not need to perform AI processing themselves.

---

# 21. Laptop Requirements

## Practical minimum

- modern 4-core CPU
- 8 GB RAM
- SSD
- two usable USB camera connections

## Recommended

- modern 6-core or better CPU
- 16 GB RAM
- SSD
- 3+ usable USB connections
- dedicated GPU not required

The system will initially use CPU-friendly pose estimation and lightweight ML.

---

# 22. Processing Resolution

We do not necessarily need to run inference at full camera resolution.

Example:

```text
Camera:
1280 × 720

       ↓ resize

Processing:
640 × 480

       ↓

MediaPipe
```

This reduces CPU load.

The exact resolution and FPS will be selected after performance testing.

---

# 23. Software Stack

## Core

```text
Python
```

## Computer Vision

```text
OpenCV
MediaPipe
```

## Data

```text
NumPy
Pandas
```

## Machine Learning

```text
scikit-learn
```

Candidate models:

```text
Random Forest
SVM
```

## Model persistence

```text
joblib
```

## Dashboard

Initial:

```text
Streamlit
```

Possible future:

```text
FastAPI / Flask
+
HTML/CSS/JavaScript or React
```

---

# 24. Local-First Architecture

The entire initial system will run locally.

```text
              USER
               |
               v
        Local Cameras
               |
               v
        Local Laptop
               |
      +--------+--------+
      |                 |
      v                 v
  AI Processing      Dashboard
      |                 |
      +--------+--------+
               |
               v
         Local Results
```

No cloud server is required for the initial system.

This is useful for:

- privacy
- offline demonstrations
- easier development
- lower infrastructure complexity
- avoiding server costs

---

# 25. Colab vs Local Development

Google Colab may be used for:

- learning experiments
- dataset exploration
- model training experiments
- visualization
- comparing ML algorithms

However, the real-time multi-camera system should ultimately be developed locally because continuous webcam access and local dashboard integration are more natural on the PC.

Recommended pattern:

```text
Colab:
Experiment / Analyze / Train

Local PC:
Camera + MediaPipe + Real-time inference + Dashboard
```

The exact workflow can be adjusted depending on implementation needs.

---

# 26. Proposed Project Directory

Initial structure:

```text
ai-posture-monitor/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── datasets/
│
├── notebooks/
│   ├── exploration.ipynb
│   ├── feature_analysis.ipynb
│   └── model_training.ipynb
│
├── src/
│   ├── camera/
│   ├── pose/
│   ├── features/
│   ├── models/
│   ├── monitoring/
│   └── utils/
│
├── models/
│   └── trained_model.joblib
│
├── dashboard/
│   └── app.py
│
├── tests/
│
├── requirements.txt
│
└── README.md
```

The exact folder structure may change as implementation progresses.

---

# 27. Development Order

The project should be developed in this order.

### Milestone 1

One camera works.

```text
Webcam
→ OpenCV
→ MediaPipe
→ Skeleton
```

### Milestone 2

Relevant landmarks and features work.

```text
Landmarks
→ Angles/distances
→ Feature vector
```

### Milestone 3

Dataset creation works.

```text
Camera
→ Features
→ Label
→ CSV
```

### Milestone 4

ML model works offline.

```text
CSV
→ Train
→ Evaluate
→ Save model
```

### Milestone 5

Real-time single-camera prediction works.

```text
Camera
→ MediaPipe
→ Features
→ Saved model
→ Prediction
```

### Milestone 6

Second camera works.

```text
Camera 1 + Camera 2
→ Independent pose processing
```

### Milestone 7

Two-camera feature fusion works.

```text
Camera 1 features
+
Camera 2 features
→ ML
→ Final posture
```

### Milestone 8

Real-time monitoring works.

```text
Posture
→ State tracking
→ Duration
→ Alerts
```

### Milestone 9

Dashboard works.

```text
Two live processed feeds
+
Skeleton overlays
+
Predictions
+
Statistics
+
Alerts
```

### Milestone 10

Evaluation and experiments.

```text
Single camera
vs
Two cameras
```

### Milestone 11 — Future

Three-camera extension.

```text
Front + Left + Right
→ Multi-view fusion
→ Final system
```

---

# 28. Important Engineering Principles

## Principle 1 — Build incrementally

Do not build the entire system at once.

## Principle 2 — Validate every stage

Before adding ML, verify pose detection.

Before training, verify features.

Before dashboard integration, verify real-time prediction.

## Principle 3 — Avoid data leakage

Do not randomly split highly correlated video frames into train/test.

## Principle 4 — Keep training separate from inference

The model should be trained offline and reused during real-time inference.

## Principle 5 — Keep the AI pipeline understandable

Use lightweight models first.

## Principle 6 — Do not overclaim medical capabilities

The system is a posture-monitoring and awareness system, not a medical diagnostic device.

Terms such as "postural health monitoring" should not be presented as clinical diagnosis.

## Principle 7 — Camera setup matters

Camera position, height, distance, lighting, and field of view can affect pose estimation and feature values.

These conditions must be documented.

---

# 29. Final Target System

The eventual two-camera system should look conceptually like:

```text
                    CAMERA 1
                  ~45° VIEW
                      |
                      v
                 +---------+
                 | OpenCV  |
                 +----+----+
                      |
                      v
                MediaPipe Pose
                      |
                      v
                  Landmarks
                      |
                      v
                   Features
                      |
                      |
                      +----------------+
                                       |
                                       v
                                  Feature Fusion
                                       ^
                                       |
                      +----------------+
                      |
                   Features
                      ^
                      |
                  Landmarks
                      ^
                      |
                MediaPipe Pose
                      ^
                      |
                 +----+----+
                 | OpenCV  |
                 +---------+
                      ^
                      |
                    CAMERA 2
                   SIDE VIEW

                                       |
                                       v
                               Trained ML Model
                                       |
                                       v
                              Posture Prediction
                                       |
                      +----------------+----------------+
                      |                                 |
                      v                                 v
              Posture Classification             Monitoring
                                                        |
                                                        v
                                                  Duration Logic
                                                        |
                                                        v
                                                     Alerts
                                                        |
                                                        v
                                                   Dashboard
                                                        |
                           +----------------------------+----------------+
                           |                            |                |
                           v                            v                v
                     Camera 1 Feed               Camera 2 Feed       Statistics
                     + Skeleton                  + Skeleton
                     + Prediction                 + Prediction
```

---

# 30. Current Decisions

The following decisions are currently established:

| Decision | Current choice |
|---|---|
| Project | AI-Based Sitting Posture Detection and Postural Health Monitoring System |
| Approach | Hybrid |
| Pose estimation | MediaPipe Pose |
| Computer vision | OpenCV |
| ML | Supervised classification |
| Candidate models | Random Forest + SVM |
| Initial cameras | 2 |
| Camera 1 | ~45° front-side |
| Camera 2 | Side |
| Future cameras | 3: front + left + right |
| Processing | Local laptop |
| GPU | Not required initially |
| Dashboard | Streamlit initially |
| Dataset | Primarily self-collected |
| Initial classes | Good, Slouching, Forward Lean |
| Real-time monitoring | Yes |
| Skeleton overlay | Yes |
| Alerts | Yes |
| Model evaluation | Accuracy, precision, recall, F1, confusion matrix |
| Data leakage prevention | Session/person-aware splitting |
| Three-camera system | Future extension |

---

# 31. Immediate Next Step

Do **not** start dataset collection or ML training yet.

The next implementation step is:

```text
Phase 1:
Set up Python
    ↓
Install OpenCV + MediaPipe
    ↓
Connect ONE camera
    ↓
Capture frames
    ↓
Detect pose
    ↓
Display skeleton
    ↓
Understand landmarks
```

After this works reliably, we will move to:

```text
Landmarks
→ Feature Engineering
→ Dataset
→ ML
→ Second Camera
→ Feature Fusion
→ Real-Time Monitoring
→ Dashboard
→ Evaluation
→ Three-Camera Extension
```

This document is the current project **Single Source of Truth (SSOT)**. Any future implementation decision should be checked against this plan and updated here if the architecture changes.
