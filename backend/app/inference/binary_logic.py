import random

class MockBinaryClassifier:
    """
    Mock binary logic to simulate the single-stage binary classification (Good/Bad).
    This unblocks the frontend while waiting for the real dataset and models.
    """
    def __init__(self):
        pass

    def evaluate_posture(self, active_cameras: list, features: dict) -> dict:
        """
        Takes in the active cameras and feature dictionary, returns the new JSON contract.
        """
        # Simulate a realistic model behavior:
        # We can randomly toggle between good and bad, but let's make it mostly good for demo
        # If 'torso_lateral_lean_angle' is large, make it bad
        
        is_bad = False
        if features and abs(features.get('torso_lateral_lean_angle', 0)) > 2.0:
             is_bad = True
        elif random.random() < 0.05: # occasional random bad posture
             is_bad = True
        
        quality = "bad" if is_bad else "good"
        confidence = round(random.uniform(0.85, 0.99), 3)

        message = "Posture is balanced."
        alert_level = "INFO"
        
        if is_bad:
            alert_level = "WARNING"
            if "front" in active_cameras:
                message = "Sideways tilt detected. Please sit up straight."
            else:
                message = "Posture deviation detected."

        return {
            "overall_quality": quality,
            "quality_confidence": confidence,
            "decided_by": "ML_BINARY_MODEL_MOCK",
            "active_cameras": active_cameras,
            "features": features,
            "feedback": {
                "alert_level": alert_level,
                "message": message
            }
        }
