import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

FRONT_CSV = os.path.join("dataset", "features_front.csv")
SIDE_CSV = os.path.join("dataset", "features_side.csv")
MODEL_DIR = os.path.join("ml-training", "saved_models")

def train_and_evaluate(df, feature_cols, target_col, model_name):
    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_preds)

    svm = Pipeline([
        ('scaler', StandardScaler()),
        ('svc', SVC(kernel='linear', random_state=42))
    ])
    svm.fit(X_train, y_train)
    svm_preds = svm.predict(X_test)
    svm_acc = accuracy_score(y_test, svm_preds)

    print(f"\n{'='*40}")
    print(f"Results for {model_name.upper()} MODEL")
    print(f"{'='*40}")
    print(f"Random Forest Accuracy : {rf_acc*100:.2f}%")
    print(f"SVM (Linear) Accuracy  : {svm_acc*100:.2f}%")

    if rf_acc >= svm_acc:
        print("\nChampion: Random Forest")
        best_model = rf
        best_preds = rf_preds
    else:
        print("\nChampion: SVM")
        best_model = svm
        best_preds = svm_preds

    print("\nClassification Report:")
    print(classification_report(y_test, best_preds))

    model_path = os.path.join(MODEL_DIR, f"{model_name}_model.pkl")
    joblib.dump(best_model, model_path)

def main():
    # --- FRONT MODEL ---
    df_front = pd.read_csv(FRONT_CSV)
    # The front camera can ONLY see left/right asymmetry. Everything else looks "normal" to it.
    df_front['target'] = df_front['posture_label'].apply(lambda x: 'asymmetricalLean' if x == 'asymmetricalLean' else 'normal')
    
    front_features = ['shoulder_tilt_angle', 'shoulder_symmetry_ratio', 'head_lateral_offset', 'torso_lateral_lean_angle']
    train_and_evaluate(df_front, front_features, 'target', 'front')

    # --- SIDE MODEL ---
    df_side = pd.read_csv(SIDE_CSV)
    # The side camera can ONLY see forward/backward curves. Asymmetrical lean and all Good postures look "normal".
    side_targets = ['slouch', 'forwardHead', 'slidingDown']
    df_side['target'] = df_side['posture_label'].apply(lambda x: x if x in side_targets else 'normal')
    
    side_features = ['neck_angle', 'torso_lean_angle', 'head_forward_dist', 'spine_curve_angle']
    train_and_evaluate(df_side, side_features, 'target', 'side')

if __name__ == "__main__":
    main()
