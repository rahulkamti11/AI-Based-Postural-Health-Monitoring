import os
import joblib
import pandas as pd

class PostureModelInference:
    """
    Loads the trained Machine Learning models (.pkl) and orchestrates 
    the Multi-Camera Fallback / Degradation Architecture.
    """
    def __init__(self):
        self.front_model = None
        self.side_model = None
        
        # Paths to models
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml-training', 'saved_models'))
        front_model_path = os.path.join(base_dir, 'front_model.pkl')
        side_model_path = os.path.join(base_dir, 'side_model.pkl')

        try:
            if os.path.exists(front_model_path):
                self.front_model = joblib.load(front_model_path)
                print(f"[Inference Engine] Front Model loaded successfully.")
            else:
                print(f"[Inference Engine] Warning: {front_model_path} not found.")

            if os.path.exists(side_model_path):
                self.side_model = joblib.load(side_model_path)
                print(f"[Inference Engine] Side Model loaded successfully.")
            else:
                print(f"[Inference Engine] Warning: {side_model_path} not found.")
        except Exception as e:
            print(f"[Inference Engine] Error loading models: {e}")

    def evaluate_posture(self, active_cameras: list, features_payload: dict, connected_cameras: list = None) -> dict:
        """
        Takes the incoming features from whatever cameras are active,
        runs the respective ML models, and coordinates the result.
        """
        if connected_cameras is None:
            connected_cameras = active_cameras

        front_prediction = "offline"
        side_prediction = "offline"
        front_prob = 0.0
        side_prob = 0.0
        
        # 1. Front Camera Inference (Independent)
        if "front" in connected_cameras:
            if "front" in active_cameras and "front" in features_payload and self.front_model:
                front_prediction = "normal"
                try:
                    df_f = pd.DataFrame([features_payload["front"]])
                    df_f = df_f[['shoulder_tilt_angle', 'shoulder_symmetry_ratio', 'head_lateral_offset', 'torso_lateral_lean_angle']]
                    front_prediction = self.front_model.predict(df_f)[0]
                    if hasattr(self.front_model, "predict_proba"):
                        front_prob = round(float(max(self.front_model.predict_proba(df_f)[0])), 2)
                except Exception as e:
                    print(f"Front inference error: {e}")
            else:
                front_prediction = "no_person"

        # 2. Side Camera Inference (Coordinated - picks left or right)
        is_side_connected = "left" in connected_cameras or "right" in connected_cameras
        if is_side_connected:
            side_data = None
            if "left" in active_cameras and "left" in features_payload:
                side_data = features_payload["left"]
            elif "right" in active_cameras and "right" in features_payload:
                side_data = features_payload["right"]

            if side_data and self.side_model:
                side_prediction = "normal"
                try:
                    df_s = pd.DataFrame([side_data])
                    df_s = df_s[['neck_angle', 'torso_lean_angle', 'head_forward_dist', 'spine_curve_angle']]
                    side_prediction = self.side_model.predict(df_s)[0]
                    if hasattr(self.side_model, "predict_proba"):
                        side_prob = round(float(max(self.side_model.predict_proba(df_s)[0])), 2)
                except Exception as e:
                    print(f"Side inference error: {e}")
            else:
                side_prediction = "no_person"

        # 3. Hybrid Combination Logic (Rule Engine)
        final_label = "upright"
        quality = "good"
        alert_level = "INFO"
        message = "Posture is balanced."

        # Handle purely offline / no person cases
        if front_prediction in ["offline", "no_person"] and side_prediction in ["offline", "no_person"]:
            quality = "standby"
            final_label = "no_person" if front_prediction == "no_person" or side_prediction == "no_person" else "offline"
            message = "No person detected in camera view." if final_label == "no_person" else "Waiting for camera streams..."
        else:
            # Priority 1: Side camera detects a major forward/backward issue
            if side_prediction not in ["normal", "offline", "no_person"]:
                final_label = side_prediction
                quality = "bad"
                alert_level = "WARNING"
                if side_prediction == "forwardHead":
                    message = "Text-neck detected! Pull your head back."
                elif side_prediction == "slouch":
                    message = "Slouching detected! Straighten your upper back."
                elif side_prediction == "slidingDown":
                    message = "Sliding off chair! Sit back into the seat."
            
            # Priority 2: Front camera detects a lateral lean
            elif front_prediction not in ["normal", "offline", "no_person"]:
                final_label = front_prediction
                quality = "bad"
                alert_level = "WARNING"
                message = "Asymmetrical leaning detected! Balance your shoulders."

        active_probs = []
        if front_prob > 0: active_probs.append(front_prob)
        if side_prob > 0: active_probs.append(side_prob)
        overall_conf = round(sum(active_probs) / len(active_probs), 2) if active_probs else 0.0

        def get_local_quality(pred):
            if pred in ["offline", "no_person"]: return "standby"
            if pred == "normal": return "good"
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
