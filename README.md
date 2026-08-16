# AI-Based Sitting Posture Detection and Postural Health Monitoring System

An AI/ML-based system for real-time sitting posture detection and postural health monitoring using computer vision, pose estimation, and machine learning.

> **Project Status:** 🚧 In Development

## Overview

The goal of this project is to develop a real-time system that can analyze a person's sitting posture using camera feeds, detect different posture conditions, and monitor how long the user remains in an unhealthy posture.

The system will use **MediaPipe Pose** to extract human body landmarks from video frames. These landmarks will then be converted into meaningful posture-related features such as body angles, alignment, and relative distances. A machine-learning classifier will use these features to classify the user's posture.

The final system is planned to support multiple camera viewpoints and provide a real-time dashboard with processed camera feeds, skeleton overlays, posture predictions, statistics, and alerts.

## Planned Architecture

```text
             Camera 1 (~45°)
                    │
                    ▼
                 OpenCV
                    │
                    ▼
              MediaPipe Pose
                    │
                    ▼
              Body Landmarks
                    │
                    ▼
             Feature Extraction
                    │
                    ▼
             Camera 1 Features
                    │
                    │
                    ├──────────────┐
                                   │
                                   ▼
                             Feature Fusion
                                   ▲
                                   │
                    ┌──────────────┤
                    │
             Camera 2 Features
                    ▲
                    │
             Feature Extraction
                    ▲
                    │
              Body Landmarks
                    ▲
                    │
              MediaPipe Pose
                    ▲
                    │
                 OpenCV
                    ▲
                    │
             Camera 2 (Side)
                                   │
                                   ▼
                            ML Classifier
                                   │
                                   ▼
                         Posture Prediction
                                   │
                       ┌───────────┴───────────┐
                       ▼                       ▼
                Posture Detection       Health Monitoring
                                               │
                                               ▼
                                            Alerts
                                               │
                                               ▼
                                           Dashboard
