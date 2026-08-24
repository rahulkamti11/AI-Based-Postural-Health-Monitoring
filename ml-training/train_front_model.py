import os
import time
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import GroupKFold, GroupShuffleSplit, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

FEATURES_FRONT_PATH = os.path.join('dataset', 'features', 'features_front.csv')
BACKEND_MODELS_DIR = os.path.join('backend', 'app', 'models')
TRAINING_SAVED_DIR = os.path.join('ml-training', 'saved_models')

FEATURE_COLS = ['shoulder_tilt_angle', 'shoulder_symmetry_ratio', 'head_lateral_offset', 'torso_lateral_lean_angle']

def train_front_models():
    print(f"Loading front features from '{FEATURES_FRONT_PATH}'...")
    df = pd.read_csv(FEATURES_FRONT_PATH)
    
    X = df[FEATURE_COLS].values
    y = df['posture_label'].values
    groups = df['subject_id'].values

    print(f"Dataset loaded: {X.shape[0]} samples, {X.shape[1]} features across {len(np.unique(groups))} unique subjects.")
    print("Classes present:", np.unique(y))

    # 1. Grouped 80/20 Train/Test Split (No subject leakage)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    groups_train = groups[train_idx]
    groups_test = groups[test_idx]

    print(f"\nTrain set: {len(X_train)} samples (Subjects: {np.unique(groups_train)})")
    print(f"Test set:  {len(X_test)} samples (Subjects: {np.unique(groups_test)})")

    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 2. 5-Fold GroupKFold Cross-Validation Comparison
    gkf = GroupKFold(n_splits=5)

    candidate_models = {
        'SVM (RBF)': SVC(kernel='rbf', C=1.0, probability=True, random_state=42, class_weight='balanced'),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'),
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
    }

    print("\n" + "="*70)
    print("=== 5-FOLD GROUP-K-FOLD CROSS-VALIDATION COMPARISON ===")
    print("="*70)

    cv_results = []
    for name, model in candidate_models.items():
        scores = []
        latencies = []
        for fold, (tr_i, val_i) in enumerate(gkf.split(X_train, y_train, groups=groups_train)):
            sc = StandardScaler()
            X_tr = sc.fit_transform(X_train[tr_i])
            X_val = sc.transform(X_train[val_i])
            
            model.fit(X_tr, y_train[tr_i])
            
            t0 = time.perf_counter()
            preds = model.predict(X_val)
            t1 = time.perf_counter()
            
            score = accuracy_score(y_train[val_i], preds)
            scores.append(score)
            latency_ms = ((t1 - t0) / len(X_val)) * 1000.0
            latencies.append(latency_ms)

        mean_acc = np.mean(scores)
        std_acc = np.std(scores)
        mean_lat = np.mean(latencies)

        cv_results.append({
            'Model': name,
            'CV Mean Accuracy': f"{mean_acc*100:.2f}%",
            'CV Std Dev': f"{std_acc*100:.2f}%",
            'Avg Latency (ms/sample)': f"{mean_lat:.4f} ms"
        })

    cv_df = pd.DataFrame(cv_results)
    print(cv_df.to_string(index=False))
    print("="*70)

    # 3. GridSearchCV Hyperparameter Tuning on SVM & Random Forest
    print("\nRunning GridSearchCV on SVM...")
    param_grid_svm = {
        'C': [0.1, 1.0, 10.0],
        'gamma': ['scale', 'auto', 0.1, 0.01],
        'kernel': ['rbf']
    }
    grid_svm = GridSearchCV(
        SVC(probability=True, random_state=42, class_weight='balanced'),
        param_grid_svm,
        cv=gkf.split(X_train_scaled, y_train, groups=groups_train),
        scoring='accuracy'
    )
    grid_svm.fit(X_train_scaled, y_train)

    best_svm = grid_svm.best_estimator_
    print(f"Best SVM Params: {grid_svm.best_params_} (Validation Accuracy: {grid_svm.best_score_*100:.2f}%)")

    # 4. Final Evaluation on Held-Out Test Set
    print("\n" + "="*70)
    print("=== FINAL TEST SET EVALUATION (BEST SVM MODEL) ===")
    print("="*70)

    test_preds = best_svm.predict(X_test_scaled)
    test_probs = best_svm.predict_proba(X_test_scaled)
    test_acc = accuracy_score(y_test, test_preds)
    test_f1 = f1_score(y_test, test_preds, average='macro')

    print(f"Test Set Accuracy: {test_acc*100:.2f}%")
    print(f"Test Set Macro F1:  {test_f1:.4f}\n")
    print("--- Detailed Classification Report ---")
    print(classification_report(y_test, test_preds))

    print("--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, test_preds, labels=np.unique(y))
    cm_df = pd.DataFrame(cm, index=[f"True:{c}" for c in np.unique(y)], columns=[f"Pred:{c}" for c in np.unique(y)])
    print(cm_df)
    print("="*70)

    # 5. Save Model and Scaler Artifacts
    os.makedirs(BACKEND_MODELS_DIR, exist_ok=True)
    os.makedirs(TRAINING_SAVED_DIR, exist_ok=True)

    svm_model_backend = os.path.join(BACKEND_MODELS_DIR, 'front_model.pkl')
    scaler_backend = os.path.join(BACKEND_MODELS_DIR, 'front_scaler.pkl')
    svm_model_saved = os.path.join(TRAINING_SAVED_DIR, 'front_model.pkl')
    scaler_saved = os.path.join(TRAINING_SAVED_DIR, 'front_scaler.pkl')

    joblib.dump(best_svm, svm_model_backend)
    joblib.dump(scaler, scaler_backend)
    joblib.dump(best_svm, svm_model_saved)
    joblib.dump(scaler, scaler_saved)

    print(f"\n[OK] Model saved to '{svm_model_backend}' and '{svm_model_saved}'")
    print(f"[OK] Scaler saved to '{scaler_backend}' and '{scaler_saved}'")

if __name__ == '__main__':
    train_front_models()
