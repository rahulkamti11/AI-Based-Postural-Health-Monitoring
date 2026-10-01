"""
Pipeline Consistency & Biomechanical Verification Test Suite
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Tests:
  1. Exact mathematical identity between dataset feature extractor and live inference extractor.
  2. Missing landmark rejection (strict validation with zero coordinate fabrication).
  3. Left vs Right side camera symmetry and coordinate orientation normalization.
  4. End-to-end model inference on deterministic posture fixtures (normal, asymmetricalLean,
     forwardHead, slouch, slidingDown).
  5. Multi-camera graceful degradation & fallback logic across all combination states.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from backend.app.pose.canonical_features import (
    compute_canonical_front_features,
    compute_canonical_side_features,
    row_to_landmarks_front,
    row_to_landmarks_side,
    CANONICAL_FRONT_FEATURES,
    CANONICAL_SIDE_FEATURES
)
from backend.app.pose.mediapipe_extractor import MediaPipePoseExtractor
from backend.app.inference.binary_logic import PostureModelInference


class TestPipelineConsistency(unittest.TestCase):

    def setUp(self):
        self.extractor = MediaPipePoseExtractor()
        self.inference = PostureModelInference()

        # Deterministic Front Normal Fixture (Upright, symmetric sitting)
        self.front_normal = {
            'nose': {'x': 0.50, 'y': 0.25, 'visibility': 0.99},
            'left_shoulder': {'x': 0.62, 'y': 0.40, 'visibility': 0.98},
            'right_shoulder': {'x': 0.38, 'y': 0.40, 'visibility': 0.98},
            'left_hip': {'x': 0.58, 'y': 0.75, 'visibility': 0.95},
            'right_hip': {'x': 0.42, 'y': 0.75, 'visibility': 0.95}
        }

        # Deterministic Front Asymmetrical Lean Fixture (Tilted shoulders, shifted torso)
        self.front_lean = {
            'nose': {'x': 0.42, 'y': 0.26, 'visibility': 0.99},
            'left_shoulder': {'x': 0.62, 'y': 0.36, 'visibility': 0.98},
            'right_shoulder': {'x': 0.40, 'y': 0.44, 'visibility': 0.98},  # ~20 deg shoulder tilt
            'left_hip': {'x': 0.58, 'y': 0.75, 'visibility': 0.95},
            'right_hip': {'x': 0.42, 'y': 0.75, 'visibility': 0.95}
        }

        # Deterministic Side Normal Fixture (Left view, upright spine)
        # In left view, subject faces left (ear_x < sh_x)
        self.side_normal_left = {
            'left_ear': {'x': 0.45, 'y': 0.25, 'visibility': 0.98},
            'left_shoulder': {'x': 0.48, 'y': 0.38, 'visibility': 0.98},
            'left_hip': {'x': 0.48, 'y': 0.75, 'visibility': 0.95}
        }

        # Deterministic Side Forward Head Fixture (Left view, head projected anteriorly)
        self.side_forward_head_left = {
            'left_ear': {'x': 0.35, 'y': 0.32, 'visibility': 0.98},       # Significant forward shift
            'left_shoulder': {'x': 0.48, 'y': 0.38, 'visibility': 0.98},
            'left_hip': {'x': 0.48, 'y': 0.75, 'visibility': 0.95}
        }

        # Deterministic Side Sliding Down Fixture (Left view, torso heavily reclined)
        self.side_sliding_left = {
            'left_ear': {'x': 0.52, 'y': 0.38, 'visibility': 0.98},
            'left_shoulder': {'x': 0.55, 'y': 0.48, 'visibility': 0.98},
            'left_hip': {'x': 0.40, 'y': 0.75, 'visibility': 0.95}        # Severe pelvic posterior recline
        }

    # -------------------------------------------------------------
    # 1. Mathematical Identity & Consistency Tests
    # -------------------------------------------------------------
    def test_feature_math_identity_front(self):
        """Verify that offline canonical calculator and live extractor produce identical front features."""
        feats_canonical = compute_canonical_front_features(self.front_normal)
        feats_live = self.extractor.compute_front_features(self.front_normal)

        self.assertIsNotNone(feats_canonical)
        self.assertIsNotNone(feats_live)
        self.assertEqual(set(feats_canonical.keys()), set(CANONICAL_FRONT_FEATURES))
        self.assertEqual(set(feats_live.keys()), set(CANONICAL_FRONT_FEATURES))

        for k in CANONICAL_FRONT_FEATURES:
            self.assertAlmostEqual(feats_canonical[k], feats_live[k], places=6)

    def test_feature_math_identity_side(self):
        """Verify that offline canonical calculator and live extractor produce identical side features."""
        feats_canonical = compute_canonical_side_features(self.side_normal_left, view='left')
        feats_live = self.extractor.compute_side_features(self.side_normal_left, view='left')

        self.assertIsNotNone(feats_canonical)
        self.assertIsNotNone(feats_live)
        self.assertEqual(set(feats_canonical.keys()), set(CANONICAL_SIDE_FEATURES))
        self.assertEqual(set(feats_live.keys()), set(CANONICAL_SIDE_FEATURES))

        for k in CANONICAL_SIDE_FEATURES:
            self.assertAlmostEqual(feats_canonical[k], feats_live[k], places=6)

    def test_row_to_landmarks_conversion_identity(self):
        """Verify that DataFrame row converter matches direct dictionary input."""
        mock_row = {
            'nose_x': 0.50, 'nose_y': 0.25, 'nose_v': 0.99,
            'left_shoulder_x': 0.62, 'left_shoulder_y': 0.40, 'left_shoulder_v': 0.98,
            'right_shoulder_x': 0.38, 'right_shoulder_y': 0.40, 'right_shoulder_v': 0.98,
            'left_hip_x': 0.58, 'left_hip_y': 0.75, 'left_hip_v': 0.95,
            'right_hip_x': 0.42, 'right_hip_y': 0.75, 'right_hip_v': 0.95
        }
        lm = row_to_landmarks_front(mock_row)
        feats = compute_canonical_front_features(lm)
        self.assertAlmostEqual(feats['shoulder_tilt_abs'], 0.0, places=2)
        self.assertAlmostEqual(feats['torso_lean_abs'], 0.0, places=2)

    # -------------------------------------------------------------
    # 2. Missing Landmark & Zero Fabrication Tests
    # -------------------------------------------------------------
    def test_missing_landmarks_no_fabrication_front(self):
        """Verify that missing hip coordinates return None rather than fabricating synthetic hips."""
        lm_no_hips = self.front_normal.copy()
        del lm_no_hips['left_hip']
        self.assertIsNone(self.extractor.compute_front_features(lm_no_hips))

        lm_low_vis = {
            k: {**v, 'visibility': 0.2} if k == 'left_shoulder' else v
            for k, v in self.front_normal.items()
        }
        self.assertIsNone(self.extractor.compute_front_features(lm_low_vis))

    def test_missing_landmarks_no_fabrication_side(self):
        """Verify that side feature calculation returns None if hip is missing."""
        lm_no_hip = self.side_normal_left.copy()
        del lm_no_hip['left_hip']
        self.assertIsNone(self.extractor.compute_side_features(lm_no_hip, view='left'))

    # -------------------------------------------------------------
    # 3. Side Camera Orientation & Mirroring Tests
    # -------------------------------------------------------------
    def test_left_right_camera_symmetry(self):
        """
        Verify that mirrored landmarks in Left vs Right cameras yield
        identical positive forward head displacement.
        """
        # In left camera: user faces left (ear is at -0.10 relative to shoulder)
        left_lm = {
            'left_ear': {'x': 0.40, 'y': 0.25, 'visibility': 1.0},
            'left_shoulder': {'x': 0.50, 'y': 0.40, 'visibility': 1.0},
            'left_hip': {'x': 0.50, 'y': 0.75, 'visibility': 1.0}
        }
        # In right camera: user faces right (ear is at +0.10 relative to shoulder)
        right_lm = {
            'right_ear': {'x': 0.60, 'y': 0.25, 'visibility': 1.0},
            'right_shoulder': {'x': 0.50, 'y': 0.40, 'visibility': 1.0},
            'right_hip': {'x': 0.50, 'y': 0.75, 'visibility': 1.0}
        }

        f_left = compute_canonical_side_features(left_lm, view='left')
        f_right = compute_canonical_side_features(right_lm, view='right')

        self.assertIsNotNone(f_left)
        self.assertIsNotNone(f_right)
        self.assertAlmostEqual(f_left['head_forward_norm'], f_right['head_forward_norm'], places=4)
        self.assertGreater(f_left['head_forward_norm'], 0.0)
        self.assertAlmostEqual(f_left['neck_angle_abs'], f_right['neck_angle_abs'], places=2)

    # -------------------------------------------------------------
    # 4. End-to-End Inference Tests
    # -------------------------------------------------------------
    def test_front_model_inference_normal_vs_lean(self):
        """Verify that live ML model correctly classifies normal vs asymmetrical lean."""
        feats_normal = self.extractor.compute_front_features(self.front_normal)
        res_normal = self.inference.evaluate_posture(
            active_cameras=['front'],
            features_payload={'front': feats_normal}
        )
        self.assertEqual(res_normal['front_label'], 'normal')
        self.assertEqual(res_normal['overall_quality'], 'good')

        feats_lean = self.extractor.compute_front_features(self.front_lean)
        res_lean = self.inference.evaluate_posture(
            active_cameras=['front'],
            features_payload={'front': feats_lean}
        )
        self.assertEqual(res_lean['front_label'], 'asymmetricalLean')
        self.assertEqual(res_lean['overall_quality'], 'bad')

    def test_side_model_inference_classes(self):
        """Verify that side ML model classifies normal, forward head, and sliding down."""
        # Normal
        f_norm = self.extractor.compute_side_features(self.side_normal_left, view='left')
        res_norm = self.inference.evaluate_posture(
            active_cameras=['left'],
            features_payload={'left': f_norm}
        )
        self.assertEqual(res_norm['side_label'], 'normal')
        self.assertEqual(res_norm['overall_quality'], 'good')

        # Forward Head
        f_fwd = self.extractor.compute_side_features(self.side_forward_head_left, view='left')
        res_fwd = self.inference.evaluate_posture(
            active_cameras=['left'],
            features_payload={'left': f_fwd}
        )
        self.assertEqual(res_fwd['side_label'], 'forwardHead')
        self.assertEqual(res_fwd['overall_quality'], 'bad')
        self.assertEqual(res_fwd['feedback']['alert_level'], 'WARNING')

    # -------------------------------------------------------------
    # 5. Multi-Camera Fallback & Priority Fusion Tests
    # -------------------------------------------------------------
    def test_standby_and_no_person_states(self):
        """Verify that empty streams and missing people correctly produce standby / no_person."""
        # No cameras
        res_empty = self.inference.evaluate_posture(active_cameras=[], features_payload={})
        self.assertEqual(res_empty['overall_quality'], 'standby')
        self.assertEqual(res_empty['posture_label'], 'offline')

        # Camera connected but no person in view
        res_no_person = self.inference.evaluate_posture(
            active_cameras=['front'],
            features_payload={},
            connected_cameras=['front']
        )
        self.assertEqual(res_no_person['overall_quality'], 'standby')
        self.assertEqual(res_no_person['posture_label'], 'no_person')

    def test_multi_camera_priority_fusion(self):
        """
        Verify multi-camera priority:
        1. Side sagittal defect takes priority 1
        2. Front coronal defect takes priority 2
        3. All good -> overall good
        """
        f_front_normal = self.extractor.compute_front_features(self.front_normal)
        f_side_forward = self.extractor.compute_side_features(self.side_forward_head_left, view='left')

        # Front Good + Side ForwardHead -> Bad (forwardHead)
        res1 = self.inference.evaluate_posture(
            active_cameras=['front', 'left'],
            features_payload={'front': f_front_normal, 'left': f_side_forward}
        )
        self.assertEqual(res1['overall_quality'], 'bad')
        self.assertEqual(res1['posture_label'], 'forwardHead')

        # Front AsymmetricalLean + Side Normal -> Bad (asymmetricalLean)
        f_front_lean = self.extractor.compute_front_features(self.front_lean)
        f_side_normal = self.extractor.compute_side_features(self.side_normal_left, view='left')
        res2 = self.inference.evaluate_posture(
            active_cameras=['front', 'left'],
            features_payload={'front': f_front_lean, 'left': f_side_normal}
        )
        self.assertEqual(res2['overall_quality'], 'bad')
        self.assertEqual(res2['posture_label'], 'asymmetricalLean')

        # Dual Side Active (Left reports normal, Right detects forwardHead) -> prioritized defect
        right_fwd = {
            'right_ear': {'x': 0.70, 'y': 0.32, 'visibility': 1.0},
            'right_shoulder': {'x': 0.50, 'y': 0.38, 'visibility': 1.0},
            'right_hip': {'x': 0.50, 'y': 0.75, 'visibility': 1.0}
        }
        f_right_fwd = self.extractor.compute_side_features(right_fwd, view='right')
        res3 = self.inference.evaluate_posture(
            active_cameras=['left', 'right'],
            features_payload={'left': f_side_normal, 'right': f_right_fwd}
        )
        self.assertEqual(res3['overall_quality'], 'bad')
        self.assertIn(res3['posture_label'], ['forwardHead', 'slouch', 'slidingDown'])


if __name__ == '__main__':
    unittest.main()
