import cv2
import numpy as np
import os
import glob

upload_dir = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded'
images = glob.glob(os.path.join(upload_dir, '*.*'))

for img_path in images:
    if not (img_path.endswith('.png') or img_path.endswith('.jpg')):
        continue
    img = cv2.imread(img_path)
    if img is None:
        continue
    
    h, w, c = img.shape
    # Check for red map (images (20).png)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_red = np.array([0, 150, 150])
    upper_red = np.array([10, 255, 255])
    mask1 = cv2.inRange(hsv, lower_red, upper_red)
    lower_red = np.array([170, 150, 150])
    upper_red = np.array([180, 255, 255])
    mask2 = cv2.inRange(hsv, lower_red, upper_red)
    mask = mask1 + mask2
    red_ratio = np.sum(mask > 0) / (h * w)
    
    print(f"{os.path.basename(img_path)}: {w}x{h}, Red ratio: {red_ratio:.5f}")
