"""
Crop Utility for 3-Panel Multi-Camera Triptych Images.
Slices 16:9 composite image into 3 individual views:
1. Left view (leftmost panel) -> dataset/raw_images/left/{posture_label}/
2. Front view (center panel)   -> dataset/raw_images/front/{posture_label}/
3. Right view (rightmost panel)-> dataset/raw_images/right/{posture_label}/
"""

import os
import cv2

RAW_IMAGES_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "raw_images"))

def crop_and_save_triptych(source_image_path, subject_id, posture_label, session_id, frame_idx, inset=5):
    if not os.path.exists(source_image_path):
        raise FileNotFoundError(f"Source image not found: {source_image_path}")
        
    img = cv2.imread(source_image_path)
    if img is None:
        raise ValueError(f"Failed to read image: {source_image_path}")
        
    h, w = img.shape[:2]
    w_third = w // 3
    
    # 3 slices with slight inset to avoid divider borders
    left_slice = img[:, 0 : w_third - inset]
    front_slice = img[:, w_third + inset : 2 * w_third - inset]
    right_slice = img[:, 2 * w_third + inset : w]
    
    # Filenames
    left_filename = f"{subject_id}_left_{posture_label}_{session_id}_{frame_idx:03d}.jpg"
    front_filename = f"{subject_id}_front_{posture_label}_{session_id}_{frame_idx:03d}.jpg"
    right_filename = f"{subject_id}_right_{posture_label}_{session_id}_{frame_idx:03d}.jpg"
    
    # Dirs
    left_dir = os.path.join(RAW_IMAGES_BASE, "left", posture_label)
    front_dir = os.path.join(RAW_IMAGES_BASE, "front", posture_label)
    right_dir = os.path.join(RAW_IMAGES_BASE, "right", posture_label)
    
    os.makedirs(left_dir, exist_ok=True)
    os.makedirs(front_dir, exist_ok=True)
    os.makedirs(right_dir, exist_ok=True)
    
    left_dest = os.path.join(left_dir, left_filename)
    front_dest = os.path.join(front_dir, front_filename)
    right_dest = os.path.join(right_dir, right_filename)
    
    cv2.imwrite(left_dest, left_slice, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(front_dest, front_slice, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(right_dest, right_slice, [cv2.IMWRITE_JPEG_QUALITY, 95])
    
    return {
        "left": left_dest,
        "front": front_dest,
        "right": right_dest
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 5:
        src, sub, post, sess, idx = sys.argv[1:6]
        res = crop_and_save_triptych(src, sub, post, sess, int(idx))
        print(f"Cropped and saved successfully:\n{res}")
    else:
        print("Usage: python crop_utils.py <src_path> <subject_id> <posture_label> <session_id> <frame_idx>")
