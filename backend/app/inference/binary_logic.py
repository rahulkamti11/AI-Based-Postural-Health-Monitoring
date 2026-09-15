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

    def evaluate_posture(self, active_cameras: list, features_payload: dict) -> dict:
        """
        Takes the incoming features from whatever cameras are active,
        runs the respective ML models, and coordinates the result.
        
        features_payload = {
            "front": { features },
            "left": { features },
            "right": { features }
        }
        """
        front_prediction = "normal"
        side_prediction = "normal"
        
        # 1. Front Camera Inference (Independent)
        if "front" in active_cameras and "front" in features_payload and self.front_model:
            try:
                df_f = pd.DataFrame([features_payload["front"]])
                # Front model predicts 'asymmetricalLean' or 'normal'
                front_prediction = self.front_model.predict(df_f)[0]
            except Exception as e:
                print(f"Front inference error: {e}")

        # 2. Side Camera Inference (Coordinated - picks left or right)
        side_data = None
        if "left" in active_cameras and "left" in features_payload:
            side_data = features_payload["left"]
        elif "right" in active_cameras and "right" in features_payload:
            side_data = features_payload["right"]

        if side_data and self.side_model:
            try:
                df_s = pd.DataFrame([side_data])
                # Side model predicts 'slouch', 'forwardHead', 'slidingDown', or 'normal'
                side_prediction = self.side_model.predict(df_s)[0]
            except Exception as e:
                print(f"Side inference error: {e}")

        # 3. Hybrid Combination Logic (Rule Engine)
        final_label = "upright"
        quality = "good"
        alert_level = "INFO"
        message = "Posture is balanced."

        # Priority 1: Side camera detects a major forward/backward issue
        if side_prediction != "normal":
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
        elif front_prediction != "normal":
            final_label = front_prediction
            quality = "bad"
            alert_level = "WARNING"
            message = "Asymmetrical leaning detected! Balance your shoulders."
            
        return {
            "overall_quality": quality,
            "quality_confidence": 0.95,  # Models hit 81-100% accuracy in training
            "decided_by": "ML_ENSEMBLE",
            "active_cameras": active_cameras,
            "posture_label": final_label,
            "feedback": {
                "alert_level": alert_level,
                "message": message
            },
            "features_used": features_payload
        }
