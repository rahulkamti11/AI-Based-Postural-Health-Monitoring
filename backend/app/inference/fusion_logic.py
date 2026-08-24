"""
Multi-Camera Fusion Logic & Graceful Degradation Engine
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

import os
import joblib
import numpy as np
from app.inference.rule_engine import evaluate_front_rules, evaluate_side_rules

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'front_model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'front_scaler.pkl')

front_model = None
front_scaler = None

def load_inference_models():
    global front_model, front_scaler
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        front_model = joblib.load(MODEL_PATH)
        front_scaler = joblib.load(SCALER_PATH)

def process_front_camera_inference(features_dict):
    """
    Process front camera features dictionary:
    {'shoulder_tilt_angle': float, 'shoulder_symmetry_ratio': float, 'head_lateral_offset': float, 'torso_lateral_lean_angle': float}
    """
    if front_model is None or front_scaler is None:
        load_inference_models()

    sh_tilt = features_dict.get('shoulder_tilt_angle', 0.0)
    torso_lean = features_dict.get('torso_lateral_lean_angle', 0.0)
    head_offset = features_dict.get('head_lateral_offset', 0.0)
    sh_sym = features_dict.get('shoulder_symmetry_ratio', 1.0)

    # 1. Try Rule Engine First
    rule_res = evaluate_front_rules(sh_tilt, torso_lean, head_offset, sh_sym)
    if rule_res is not None:
        return rule_res

    # 2. Fallback to ML Model
    if front_model is not None and front_scaler is not None:
        feat_vector = np.array([[sh_tilt, sh_sym, head_offset, torso_lean]])
        scaled_feat = front_scaler.transform(feat_vector)
        
        pred_label = front_model.predict(scaled_feat)[0]
        pred_probs = front_model.predict_proba(scaled_feat)[0]
        max_conf = float(np.max(pred_probs))
        
        posture_quality = 'good' if pred_label == 'neutral_spinal_alignment' else 'bad'
        
        return {
            'posture_label': str(pred_label),
            'posture_quality': posture_quality,
            'rule_triggered': None,
            'confidence': round(max_conf, 4),
            'decided_by': 'ml_model'
        }

    return {
        'posture_label': 'neutral_spinal_alignment',
        'posture_quality': 'good',
        'rule_triggered': 'fallback',
        'confidence': 0.5,
        'decided_by': 'default_fallback'
    }

def fuse_camera_predictions(active_camera_predictions):
    """
    Fuses predictions from active cameras using weighted voting & degradation tracking.
    active_camera_predictions: dict mapping camera_id ('front', 'left', 'right') -> camera prediction dict
    """
    if not active_camera_predictions:
        return {
            'posture_label': 'neutral_spinal_alignment',
            'posture_quality': 'good',
            'analysis_mode': 'No Active Cameras',
            'contributing_cameras': [],
            'decided_by': 'fallback'
        }

    camera_count = len(active_camera_predictions)
    active_cams = list(active_camera_predictions.keys())

    if camera_count == 3:
        analysis_mode = "Full 3-Camera Analysis"
    elif camera_count == 2:
        analysis_mode = "Partial Dual-Camera Analysis"
    else:
        analysis_mode = f"Single-Camera Analysis ({active_cams[0].capitalize()}-View)"

    # Weighted voting calculation
    weights = {'front': 1.2, 'left': 1.0, 'right': 1.0}
    label_scores = {}

    for cam_id, pred in active_camera_predictions.items():
        label = pred['posture_label']
        conf = pred.get('confidence', 0.8)
        w = weights.get(cam_id, 1.0)
        
        score = conf * w
        label_scores[label] = label_scores.get(label, 0.0) + score

    # Select winner
    best_label = max(label_scores, key=label_scores.get)
    quality = 'good' if best_label == 'neutral_spinal_alignment' else 'bad'
    winner_pred = next((p for p in active_camera_predictions.values() if p['posture_label'] == best_label), list(active_camera_predictions.values())[0])

    return {
        'posture_label': best_label,
        'posture_quality': quality,
        'analysis_mode': analysis_mode,
        'contributing_cameras': active_cams,
        'confidence': winner_pred.get('confidence', 0.85),
        'decided_by': winner_pred.get('decided_by', 'hybrid_fusion'),
        'rule_triggered': winner_pred.get('rule_triggered', None)
    }
