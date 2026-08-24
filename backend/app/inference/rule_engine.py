"""
Rule Engine — Deterministic Posture Threshold Evaluator
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Combines clinical literature thresholds (Strong/Adapted) and empirical dataset-derived cutoffs.
"""

def evaluate_front_rules(shoulder_tilt_angle, torso_lateral_lean_angle, head_lateral_offset=0.0, shoulder_symmetry_ratio=1.0):
    """
    Evaluates front-view features against deterministic rules.
    Returns: (predicted_label, posture_quality, rule_triggered, confidence) or None if no rule fires.
    """
    # Rule 1: Torso Lateral Lean Angle (Empirical: > +15° = Left Tilt, < -15° = Right Tilt)
    if torso_lateral_lean_angle > 15.0:
        return {
            'posture_label': 'lateral_trunk_tilt_left',
            'posture_quality': 'bad',
            'rule_triggered': 'Empirical torso_lateral_lean_angle > 15.0°',
            'confidence': 0.95,
            'decided_by': 'rule_engine'
        }
    elif torso_lateral_lean_angle < -15.0:
        return {
            'posture_label': 'lateral_trunk_tilt_right',
            'posture_quality': 'bad',
            'rule_triggered': 'Empirical torso_lateral_lean_angle < -15.0°',
            'confidence': 0.95,
            'decided_by': 'rule_engine'
        }

    # Rule 2: Shoulder Tilt Angle (Adapted: > 7° deviation from horizontal)
    # Note: horizontal level is around -170° to -180° depending on arctan quadrant
    if abs(shoulder_tilt_angle + 170.0) > 12.0:
        if shoulder_tilt_angle > -170.0:
            label = 'lateral_trunk_tilt_left'
        else:
            label = 'lateral_trunk_tilt_right'
            
        return {
            'posture_label': label,
            'posture_quality': 'bad',
            'rule_triggered': 'Adapted shoulder_tilt_angle deviation > 12.0°',
            'confidence': 0.85,
            'decided_by': 'rule_engine'
        }

    # Defer to ML model if no rule strongly triggers
    return None

def evaluate_side_rules(neck_angle, spine_curve_angle=None, torso_lean_angle=None):
    """
    Evaluates side-view features (Left / Right camera).
    Returns: (predicted_label, posture_quality, rule_triggered, confidence) or None.
    """
    # Rule 1: Craniovertebral Angle (CVA) < 48° (Strong Clinical Threshold)
    if neck_angle is not None and neck_angle < 48.0:
        return {
            'posture_label': 'cervical_forward_head_posture',
            'posture_quality': 'bad',
            'rule_triggered': 'Strong Clinical CVA neck_angle < 48.0°',
            'confidence': 0.98,
            'decided_by': 'rule_engine'
        }

    # Rule 2: Recline Angle
    if torso_lean_angle is not None and torso_lean_angle > 25.0:
        return {
            'posture_label': 'posterior_trunk_recline',
            'posture_quality': 'bad',
            'rule_triggered': 'Empirical torso_lean_angle > 25.0°',
            'confidence': 0.90,
            'decided_by': 'rule_engine'
        }

    return None
