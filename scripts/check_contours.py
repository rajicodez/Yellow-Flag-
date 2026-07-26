import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785075971406.png'
img = cv2.imread(img_path)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

lower_red1 = np.array([0, 100, 100])
upper_red1 = np.array([10, 255, 255])
mask1 = cv2.inRange(hsv, lower_red1, upper_red1)

lower_red2 = np.array([170, 100, 100])
upper_red2 = np.array([180, 255, 255])
mask2 = cv2.inRange(hsv, lower_red2, upper_red2)

mask = mask1 + mask2

contours, hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
if not contours:
    print("No contours found")
    exit()

# Get the contour with the maximum length (arcLength)
contour = max(contours, key=lambda c: cv2.arcLength(c, True))
print(f"Max length contour has {len(contour)} points, arcLength: {cv2.arcLength(contour, True)}")

minx = min(p[0][0] for p in contour)
maxx = max(p[0][0] for p in contour)
miny = min(p[0][1] for p in contour)
maxy = max(p[0][1] for p in contour)
print(f"Largest contour box: X({minx}-{maxx}), Y({miny}-{maxy})")
