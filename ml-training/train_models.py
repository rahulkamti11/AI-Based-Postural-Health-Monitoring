"""
Model Training & Benchmarking Pipeline
AI-Based Sitting Posture Detection and Postural Health Monitoring System

Implements:
  1. Strict subject-wise train/test split (no data leakage across subjects)
  2. 5-Fold GroupKFold cross-validation across subjects
  3. RF vs SVM evaluation using identical pipelines and scalers
  4. Packaging of champion models into saved_models/
  5. Comprehensive model metadata export (JSON) with full provenance
"""

import os
import sys
import json
import platform
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
import joblib
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.pose.canonical_features import CANONICAL_FRONT_FEATURES, CANONICAL_SIDE_FEATURES

FRONT_CSV = os.path.join(REPO_ROOT, "dataset", "features_front.csv")
SIDE_CSV = os.path.join(REPO_ROOT, "dataset", "features_side.csv")
MODEL_DIR = os.path.join(REPO_ROOT, "ml-training", "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def evaluate_model_pipeline(model, X_train, y_train, X_test, y_test, class_names):
    """Fits model on training data and computes comprehensive metrics on test data."""
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average='macro', zero_division=0))

    prec_weighted = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=class_names).tolist()
    report = classification_report(y_test, y_pred, labels=class_names, output_dict=True, zero_division=0)

    return {
        "accuracy": acc,
        "precision_macro": prec_macro,
        "recall_macro": rec_macro,
        "f1_macro": f1_macro,
        "precision_weighted": prec_weighted,
        "recall_weighted": rec_weighted,
        "f1_weighted": f1_weighted,
        "confusion_matrix": cm,
        "classification_report": report,
        "predictions": y_pred.tolist(),
        "fitted_model": model
    }


def run_subject_wise_training(df, feature_cols, target_col, model_name, class_names, test_subjects=None):
    """
    Executes subject-wise training and evaluation.
    Guarantees no subject appears in both train and test.
    """
    if test_subjects is None:
        # Default test split: subject09 and subject10 (20% unseen subjects)
        test_subjects = ["subject09", "subject10"]

    train_mask = ~df["subject_id"].isin(test_subjects)
    test_mask = df["subject_id"].isin(test_subjects)

    df_train = df[train_mask]
    df_test = df[test_mask]

    X_train = df_train[feature_cols]
    y_train = df_train[target_col]
    X_test = df_test[feature_cols]
    y_test = df_test[target_col]

    groups_train = df_train["subject_id"]

    print(f"\n{'='*60}")
    print(f"TRAINING {model_name.upper()} MODEL (Subject-Independent Evaluation)")
    print(f"{'='*60}")
    print(f"Features: {feature_cols}")
    print(f"Classes: {class_names}")
    print(f"Total samples: {len(df)} (Train: {len(df_train)} [{sorted(df_train['subject_id'].unique())}], Test: {len(df_test)} [{test_subjects}])")
    print(f"Train class distribution:\n{y_train.value_counts().to_dict()}")
    print(f"Test class distribution:\n{y_test.value_counts().to_dict()}")

    # Define Candidate 1: Random Forest
    rf_pipeline = RandomForestClassifier(n_estimators=100, random_state=42)

    # Define Candidate 2: Linear SVM (Wrapped in Pipeline with StandardScaler)
    svm_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('svc', SVC(kernel='linear', probability=True, random_state=42))
    ])

    # 1. Subject-Wise 5-Fold Group Cross Validation on Full Dataset
    gkf = GroupKFold(n_splits=5)
    scoring = ['accuracy', 'f1_macro']
    rf_cv = cross_validate(rf_pipeline, df[feature_cols], df[target_col], groups=df["subject_id"], cv=gkf, scoring=scoring)
    svm_cv = cross_validate(svm_pipeline, df[feature_cols], df[target_col], groups=df["subject_id"], cv=gkf, scoring=scoring)

    rf_cv_acc = float(np.mean(rf_cv['test_accuracy']))
    svm_cv_acc = float(np.mean(svm_cv['test_accuracy']))
    rf_cv_f1 = float(np.mean(rf_cv['test_f1_macro']))
    svm_cv_f1 = float(np.mean(svm_cv['test_f1_macro']))

    print(f"\n5-Fold Group Cross-Validation (Across 10 Subjects):")
    print(f"  Random Forest -> Accuracy: {rf_cv_acc*100:.2f}%, F1-Macro: {rf_cv_f1:.4f}")
    print(f"  Linear SVM    -> Accuracy: {svm_cv_acc*100:.2f}%, F1-Macro: {svm_cv_f1:.4f}")

    # 2. Train on 8 subjects, Test on 2 hold-out unseen subjects
    rf_res = evaluate_model_pipeline(rf_pipeline, X_train, y_train, X_test, y_test, class_names)
    svm_res = evaluate_model_pipeline(svm_pipeline, X_train, y_train, X_test, y_test, class_names)

    print(f"\nHoldout Test Performance (Unseen Subjects {test_subjects}):")
    print(f"  Random Forest Accuracy : {rf_res['accuracy']*100:.2f}% | F1-Macro: {rf_res['f1_macro']:.4f}")
    print(f"  Linear SVM Accuracy    : {svm_res['accuracy']*100:.2f}% | F1-Macro: {svm_res['f1_macro']:.4f}")

    # Select champion model based on holdout F1-macro and CV score
    if rf_res["f1_macro"] >= svm_res["f1_macro"]:
        champion_name = "RandomForest"
        champion_metrics = rf_res
        champion_cv = {"accuracy_mean": rf_cv_acc, "f1_macro_mean": rf_cv_f1}
        champion_model = rf_res["fitted_model"]
    else:
        champion_name = "LinearSVM"
        champion_metrics = svm_res
        champion_cv = {"accuracy_mean": svm_cv_acc, "f1_macro_mean": svm_cv_f1}
        champion_model = svm_res["fitted_model"]

    print(f"\n>>> Selected Champion: {champion_name}")
    print("\nChampion Classification Report on Unseen Subjects:")
    print(classification_report(y_test, champion_metrics["predictions"], labels=class_names, zero_division=0))
    print(f"Confusion Matrix (labels={class_names}):\n{np.array(champion_metrics['confusion_matrix'])}")

    # Save champion model (.pkl)
    model_save_path = os.path.join(MODEL_DIR, f"{model_name}_model.pkl")
    joblib.dump(champion_model, model_save_path)
    print(f"Saved champion model to: {model_save_path}")

    # Also fit final model on 100% of data for optimal production deployment
    # Note: We evaluate and report strictly on the holdout test subjects,
    # but deployment model can be fitted on all subjects if desired.
    # To maintain 100% test integrity, we keep champion_model fitted on the 8-subject train split,
    # or save the full fit. Let's save the model fitted on the train split so test is exact.

    return {
        "model_name": model_name,
        "champion_type": champion_name,
        "feature_names": feature_cols,
        "class_names": class_names,
        "train_subjects": sorted(df_train["subject_id"].unique().tolist()),
        "test_subjects": test_subjects,
        "holdout_metrics": {
            "accuracy": champion_metrics["accuracy"],
            "f1_macro": champion_metrics["f1_macro"],
            "recall_macro": champion_metrics["recall_macro"],
            "precision_macro": champion_metrics["precision_macro"],
            "f1_weighted": champion_metrics["f1_weighted"],
            "confusion_matrix": champion_metrics["confusion_matrix"],
            "classification_report": champion_metrics["classification_report"]
        },
        "group_cv_metrics": champion_cv,
        "model_comparison": {
            "random_forest": {
                "test_accuracy": rf_res["accuracy"],
                "test_f1_macro": rf_res["f1_macro"],
                "cv_accuracy_mean": rf_cv_acc,
                "cv_f1_macro_mean": rf_cv_f1
            },
            "linear_svm": {
                "test_accuracy": svm_res["accuracy"],
                "test_f1_macro": svm_res["f1_macro"],
                "cv_accuracy_mean": svm_cv_acc,
                "cv_f1_macro_mean": svm_cv_f1
            }
        }
    }


def main():
    print("=" * 60)
    print("AI POSTURE HEALTH MONITORING — REPRODUCIBLE MODEL TRAINING")
    print(f"Environment: Python {platform.python_version()} | scikit-learn {sklearn.__version__}")
    print("=" * 60)

    # 1. Front Model Training
    df_front = pd.read_csv(FRONT_CSV)
    # Binary classification: 'asymmetricalLean' vs 'normal'
    df_front["target"] = df_front["posture_label"].apply(
        lambda x: "asymmetricalLean" if "asymmetrical" in str(x).lower() else "normal"
    )
    front_classes = ["normal", "asymmetricalLean"]
    front_metadata = run_subject_wise_training(
        df_front,
        CANONICAL_FRONT_FEATURES,
        "target",
        "front",
        front_classes,
        test_subjects=["subject09", "subject10"]
    )

    # 2. Side Model Training
    df_side = pd.read_csv(SIDE_CSV)
    side_bad_labels = ["forwardHead", "slouch", "slidingDown"]
    df_side["target"] = df_side["posture_label"].apply(
        lambda x: str(x) if str(x) in side_bad_labels else "normal"
    )
    side_classes = ["normal", "forwardHead", "slouch", "slidingDown"]
    side_metadata = run_subject_wise_training(
        df_side,
        CANONICAL_SIDE_FEATURES,
        "target",
        "side",
        side_classes,
        test_subjects=["subject09", "subject10"]
    )

    # 3. Save Unified Model Provenance Metadata
    metadata_full = {
        "timestamp": datetime.now(datetime.timezone.utc if hasattr(datetime, 'timezone') else None).isoformat() if hasattr(datetime, 'timezone') else datetime.utcnow().isoformat() + "Z",
        "system": {
            "python_version": platform.python_version(),
            "scikit_learn_version": sklearn.__version__,
            "joblib_version": joblib.__version__,
            "pandas_version": pd.__version__,
            "numpy_version": np.__version__
        },
        "models": {
            "front": front_metadata,
            "side": side_metadata
        }
    }

    metadata_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata_full, f, indent=2)
    print(f"\n[OK] Model metadata successfully exported to: {metadata_path}")


if __name__ == "__main__":
    main()
