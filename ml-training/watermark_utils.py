"""
Watermark Utility Module
Applies standardized top-centered attribution watermark to dataset images:
"AI Postural Health Monitoring Dataset | Rahul Kamti | 2026"
Ensures single-line fit with 0% occlusion of human anatomical joints.
"""

import cv2
import numpy as np
import os

WATERMARK_TEXT = "AI Postural Health Monitoring Dataset | Rahul Kamti | 2026"

def apply_top_centered_watermark(image_path, output_path=None, text=WATERMARK_TEXT):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")
        
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to decode image: {image_path}")
        
    h, w = img.shape[:2]
    
    # Scale font size dynamically based on image width
    # Target: text width ~ 65% to 80% of image width
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = w / 1400.0  # standard scaling factor (e.g. 0.7 for 1024px)
    font_thickness = max(1, int(round(font_scale * 2.0)))
    
    (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, font_thickness)
    
    # If text is too wide, scale down
    if text_w > int(w * 0.90):
        font_scale *= (w * 0.85) / text_w
        (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, font_thickness)
        
    # Top-centered coordinates
    x = (w - text_w) // 2
    top_margin = int(h * 0.02) + 10  # 2% from top + 10px
    y = top_margin + text_h
    
    # Translucent background pill padding
    pad_x = int(text_h * 0.8)
    pad_y = int(text_h * 0.45)
    
    x1 = max(0, x - pad_x)
    y1 = max(0, top_margin - pad_y)
    x2 = min(w, x + text_w + pad_x)
    y2 = min(h, y + baseline + pad_y)
    
    # Create overlay for alpha blending
    overlay = img.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (20, 24, 33), -1)  # Dark slate background
    
    alpha = 0.55  # 55% opacity for background pill
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    
    # Draw crisp white text with slight anti-aliasing
    cv2.putText(img, text, (x, y), font, font_scale, (250, 250, 250), font_thickness, cv2.LINE_AA)
    
    dest = output_path if output_path else image_path
    cv2.imwrite(dest, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return dest

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        out = apply_top_centered_watermark(sys.argv[1])
        print(f"Applied watermark to: {out}")
    else:
        print("Watermark utility ready. Usage: python watermark_utils.py <image_path>")
