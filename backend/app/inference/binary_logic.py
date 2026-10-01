"""
Live Machine Learning Inference Engine & Multi-Camera Posture Decision Logic
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Loads the champion trained models and enforces canonical feature alignment,
deterministic column ordering, and graceful multi-camera degradation.
"""

import os
import json
from typing import Dict, List, Any, Optional
import joblib
import pandas as pd

try:
    from app.pose.canonical_features import CANONICAL_FRONT_FEATURES, CANONICAL_SIDE_FEATURES
except ImportError:
    from backend.app.pose.canonical_features import CANONICAL_FRONT_FEATURES, CANONICAL_SIDE_FEATURES



class PostureModelInference:
    """
    Loads trained front and side ML models (.pkl) and orchestrates
    real-time multi-camera fusion and graceful degradation.
    """
    def __init__(self):
        self.front_model = None
        self.side_model = None
        self.metadata = None

        base_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml-training', 'saved_models')
        )
        front_model_path = os.path.join(base_dir, 'front_model.pkl')
        side_model_path = os.path.join(base_dir, 'side_model.pkl')
        metadata_path = os.path.join(base_dir, 'model_metadata.json')

        try:
            if os.path.exists(front_model_path):
                self.front_model = joblib.load(front_model_path)
                print(f"[Inference Engine] Front Model loaded successfully from {front_model_path}")
            else:
                print(f"[Inference Engine] Warning: {front_model_path} not found.")

            if os.path.exists(side_model_path):
                self.side_model = joblib.load(side_model_path)
                print(f"[Inference Engine] Side Model loaded successfully from {side_model_path}")
            else:
                print(f"[Inference Engine] Warning: {side_model_path} not found.")

            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                print(f"[Inference Engine] Model metadata loaded successfully.")
        except Exception as e:
            print(f"[Inference Engine] Error loading models: {e}")

    def evaluate_posture(
        self,
        active_cameras: List[str],
        features_payload: Dict[str, Any],
        connected_cameras: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Runs ML models on incoming canonical features and coordinates multi-camera posture status.
        """
        if connected_cameras is None:
            connected_cameras = active_cameras

        front_prediction = "offline"
        side_prediction = "offline"
        front_prob = 0.0
        side_prob = 0.0

        # -------------------------------------------------------------
        # 1. Front Camera Inference (Coronal Plane: Asymmetrical Lean)
        # -------------------------------------------------------------
        if "front" in connected_cameras:
            if "front" in active_cameras and "front" in features_payload and self.front_model:
                try:
                    df_f = pd.DataFrame([features_payload["front"]])[CANONICAL_FRONT_FEATURES]
                    front_prediction = str(self.front_model.predict(df_f)[0])
                    if hasattr(self.front_model, "predict_proba"):
                        probs = self.front_model.predict_proba(df_f)[0]
                        front_prob = round(float(max(probs)), 2)
                    else:
                        front_prob = 0.90
                except Exception as e:
                    print(f"[Inference Engine] Front inference error: {e}")
                    front_prediction = "normal"
            else:
                front_prediction = "no_person"

        # -------------------------------------------------------------
        # 2. Side Camera Inference (Sagittal Plane: Forward Head, Slouch, Slide)
        # Supports Left, Right, or Dual-Side cameras
        # -------------------------------------------------------------
        is_side_connected = ("left" in connected_cameras) or ("right" in connected_cameras)
        if is_side_connected:
            side_candidates = []

            for side_cam in ("left", "right"):
                if side_cam in active_cameras and side_cam in features_payload and self.side_model:
                    try:
                        df_s = pd.DataFrame([features_payload[side_cam]])[CANONICAL_SIDE_FEATURES]
                        pred = str(self.side_model.predict(df_s)[0])
                        prob = 0.85
                        if hasattr(self.side_model, "predict_proba"):
                            probs = self.side_model.predict_proba(df_s)[0]
                            prob = round(float(max(probs)), 2)
                        side_candidates.append({
                            "view": side_cam,
                            "prediction": pred,
                            "confidence": prob
                        })
                    except Exception as e:
                        print(f"[Inference Engine] Side ({side_cam}) inference error: {e}")

            if side_candidates:
                # If either side camera detects a defect, prioritize that defect
                defects = [c for c in side_candidates if c["prediction"] != "normal"]
                if defects:
                    # Select the defect with highest confidence
                    best_defect = max(defects, key=lambda c: c["confidence"])
                    side_prediction = best_defect["prediction"]
                    side_prob = best_defect["confidence"]
                else:
                    # Both/all active side cameras report normal
                    best_normal = max(side_candidates, key=lambda c: c["confidence"])
                    side_prediction = "normal"
                    side_prob = best_normal["confidence"]
            else:
                side_prediction = "no_person"

        # -------------------------------------------------------------
        # 3. Multi-Camera Decision Logic (Graceful Degradation)
        # -------------------------------------------------------------
        final_label = "upright"
        quality = "good"
        alert_level = "INFO"
        message = "Posture is balanced and aligned."

        # Case A: System standby (no cameras active or no person detected)
        if front_prediction in ["offline", "no_person"] and side_prediction in ["offline", "no_person"]:
            quality = "standby"
            final_label = "no_person" if (front_prediction == "no_person" or side_prediction == "no_person") else "offline"
            message = "No person detected in camera view." if final_label == "no_person" else "Waiting for camera streams..."

        # Case B: One or more active streams
        else:
            # Priority 1: Side camera detects a sagittal spinal defect
            if side_prediction not in ["normal", "offline", "no_person"]:
                final_label = side_prediction
                quality = "bad"
                alert_level = "WARNING"
                if side_prediction == "forwardHead":
                    message = "Text-neck detected! Pull your head back and align your ears with your shoulders."
                elif side_prediction == "slouch":
                    message = "Slouching detected! Roll your shoulders back and open your chest."
                elif side_prediction == "slidingDown":
                    message = "Sliding down detected! Sit all the way back into the chair seat."

            # Priority 2: Front camera detects a lateral lean or shoulder imbalance
            elif front_prediction not in ["normal", "offline", "no_person"]:
                final_label = front_prediction
                quality = "bad"
                alert_level = "WARNING"
                message = "Asymmetrical leaning detected! Balance your torso weight evenly."

            # Priority 3: All active views report normal
            else:
                quality = "good"
                final_label = "upright"
                alert_level = "INFO"
                message = "Optimal spinal alignment maintained."

        # Compute overall confidence from active models
        active_probs = []
        if front_prob > 0:
            active_probs.append(front_prob)
        if side_prob > 0:
            active_probs.append(side_prob)
        overall_conf = round(sum(active_probs) / len(active_probs), 2) if active_probs else 0.0

        def get_local_quality(pred: str) -> str:
            if pred in ["offline", "no_person"]:
                return "standby"
            if pred == "normal":
                return "good"
            return "bad"

        return {
            "overall_quality": quality,
            "front_quality": get_local_quality(front_prediction),
            "side_quality": get_local_quality(side_prediction),
            "front_label": front_prediction.replace('_', ' '),
            "side_label": side_prediction.replace('_', ' '),
            "quality_confidence": overall_conf,
            "front_confidence": front_prob,
            "side_confidence": side_prob,
            "decided_by": "ML_ENSEMBLE",
            "active_cameras": active_cameras,
            "posture_label": final_label,
            "feedback": {
                "alert_level": alert_level,
                "message": message
            },
            "features_used": features_payload
        }
