"""
MediaPipe Landmark Extractor & Real-Time Feature Calculation Module
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Directly utilizes the unified canonical feature calculator (canonical_features.py)
to guarantee 100% mathematical consistency between offline training and live inference.
"""

from typing import Dict, Any, Optional
try:
    from app.pose.canonical_features import (
        compute_canonical_front_features,
        compute_canonical_side_features,
        CANONICAL_FRONT_FEATURES,
        CANONICAL_SIDE_FEATURES
    )
except ImportError:
    from backend.app.pose.canonical_features import (
        compute_canonical_front_features,
        compute_canonical_side_features,
        CANONICAL_FRONT_FEATURES,
        CANONICAL_SIDE_FEATURES
    )



class MediaPipePoseExtractor:
    """
    Computes canonical posture features from MediaPipe landmarks streamed by the browser.
    Ensures strict validation and zero synthetic landmark fabrication.
    """
    def __init__(self):
        self.front_features_list = CANONICAL_FRONT_FEATURES
        self.side_features_list = CANONICAL_SIDE_FEATURES

    def compute_front_features(self, landmarks: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Computes the 4 canonical front geometric features from extracted landmarks dictionary.
        Returns None if key landmarks (nose, shoulders, hips) are absent or low visibility.
        """
        return compute_canonical_front_features(landmarks)

    def compute_side_features(self, landmarks: Dict[str, Any], view: str = 'left') -> Optional[Dict[str, float]]:
        """
        Computes the 4 canonical side geometric features from extracted landmarks dictionary.
        Handles view orientation (left vs right side camera).
        Returns None if key landmarks (ear, shoulder, hip) are absent or low visibility.
        """
        return compute_canonical_side_features(landmarks, view=view)

    def close(self):
        """Cleanup handler."""
        pass
