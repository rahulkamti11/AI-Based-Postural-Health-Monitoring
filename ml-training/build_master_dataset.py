import os
import pandas as pd
import numpy as np

# Configurable subsampling rate N
N_SUBSAMPLE = 5

RAW_CSV_PATH = os.path.join('dataset', 'public_dataset', 'multiposture', 'data.csv')
MASTER_CSV_PATH = os.path.join('dataset', 'master_dataset.csv')

LABEL_MAPPING = {
    'TUP': 'neutral_spinal_alignment',
    'TLF': 'thoracic_kyphotic_slouch',
    'TLB': 'posterior_trunk_recline',
    'TLL': 'lateral_trunk_tilt_left',
    'TLR': 'lateral_trunk_tilt_right'
}

def build_master_dataset():
    print(f"Loading raw MultiPosture dataset from '{RAW_CSV_PATH}'...")
    df = pd.read_csv(RAW_CSV_PATH)
    orig_row_count = len(df)
    print(f"Raw dataset loaded. Total rows: {orig_row_count}, Columns: {len(df.columns)}")

    # 1. Drop lower body columns
    drop_prefixes = ('left_knee', 'right_knee', 'left_ankle', 'right_ankle',
                     'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index')
    cols_to_drop = ['lowerbody_label'] + [c for c in df.columns if c.startswith(drop_prefixes)]
    df = df.drop(columns=cols_to_drop)

    # 2. Rename subject -> subject_id
    df = df.rename(columns={'subject': 'subject_id'})

    # 3. Map upperbody_label -> posture_label & drop upperbody_label
    df['posture_label'] = df['upperbody_label'].map(LABEL_MAPPING)
    df = df.drop(columns=['upperbody_label'])

    # 4. Add posture_quality (good / bad)
    df['posture_quality'] = df['posture_label'].apply(lambda x: 'good' if x == 'neutral_spinal_alignment' else 'bad')

    # 5. Metadata columns
    df['source_dataset'] = 'multiposture'
    df['camera_view'] = 'front'

    # 6. Generate session_id (consecutive rows with same subject_id and posture_label)
    # Increment session whenever subject_id or posture_label changes from previous row
    change_mask = (df['subject_id'] != df['subject_id'].shift()) | (df['posture_label'] != df['posture_label'].shift())
    df['session_id'] = change_mask.cumsum()

    # Pre de-duplication counts
    pre_label_counts = df['posture_label'].value_counts()
    pre_quality_counts = df['posture_quality'].value_counts()

    # 7. De-duplicate near-identical consecutive frames per session_id group (keep every Nth frame + first/last)
    subsampled_rows = []
    for sid, group in df.groupby('session_id', as_index=False):
        n = len(group)
        if n <= 2:
            subsampled_rows.append(group)
        else:
            sub_indices = set(range(0, n, N_SUBSAMPLE))
            sub_indices.add(n - 1)  # Always preserve endpoint
            sorted_indices = sorted(list(sub_indices))
            subsampled_rows.append(group.iloc[sorted_indices])

    df_dedup = pd.concat(subsampled_rows, ignore_index=True)

    post_row_count = len(df_dedup)
    reduction_pct = ((orig_row_count - post_row_count) / orig_row_count) * 100.0

    # 8. Reorder columns
    meta_cols = ['subject_id', 'source_dataset', 'camera_view', 'session_id', 'posture_label', 'posture_quality']
    landmark_cols = [c for c in df_dedup.columns if c not in meta_cols]
    final_cols = meta_cols + landmark_cols
    df_final = df_dedup[final_cols]

    # 9. Save master_dataset.csv
    os.makedirs(os.path.dirname(MASTER_CSV_PATH), exist_ok=True)
    df_final.to_csv(MASTER_CSV_PATH, index=False)
    print(f"\n[OK] Master dataset saved to '{MASTER_CSV_PATH}'")

    # 10. Summary & Reports
    print("\n" + "="*60)
    print("=== MASTER DATASET GENERATION SUMMARY ===")
    print("="*60)
    print(f"Original Row Count:            {orig_row_count}")
    print(f"Subsampled/Deduplicated Count: {post_row_count}")
    print(f"Reduction Percentage:          {reduction_pct:.2f}% (Subsampling N={N_SUBSAMPLE})")
    print(f"Final Column Count:            {len(final_cols)}")

    print("\n--- posture_label Breakdown ---")
    post_label_counts = df_final['posture_label'].value_counts()
    comp_label_df = pd.DataFrame({
        'Before (Raw)': pre_label_counts,
        'After (Subsampled)': post_label_counts
    })
    print(comp_label_df)

    print("\n--- posture_quality Breakdown ---")
    post_quality_counts = df_final['posture_quality'].value_counts()
    comp_quality_df = pd.DataFrame({
        'Before (Raw)': pre_quality_counts,
        'After (Subsampled)': post_quality_counts
    })
    print(comp_quality_df)
    print("="*60)

if __name__ == '__main__':
    build_master_dataset()
