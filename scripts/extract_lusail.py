import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785050758366.jpg'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

if img is None:
    print("Failed to load image.")
    exit(1)

# Ensure it's BGR
if len(img.shape) == 3 and img.shape[2] == 4:
    b, g, r, a = cv2.split(img)
    mask = ((r < 50) & (g < 50) & (b < 50)).astype(np.uint8) * 255
elif len(img.shape) == 3:
    b, g, r = cv2.split(img)
    mask = ((r < 50) & (g < 50) & (b < 50)).astype(np.uint8) * 255
else:
    mask = (img < 50).astype(np.uint8) * 255

# Closing to fill holes (the thick black line might have small anti-aliasing artifacts)
kernel = np.ones((7,7), np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

# Keep only the largest connected component
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
if num_labels > 1:
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    mask = (labels == largest_label).astype(np.uint8) * 255

skel = mask
try:
    skel = cv2.ximgproc.thinning(mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
except:
    pass

# Find contours of the skeleton
contours, _ = cv2.findContours(skel, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

if len(contours) > 10: 
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    
pts = max(contours, key=cv2.contourArea)
pts = pts.reshape(-1, 2)

# Subsample
step = 4
simplified = pts[::step].tolist()

if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

# Start/finish line is on the bottom straight (Max Y)
# Racing direction from Turn 16 (right) to Turn 1 (left).
# The bottom straight is around max_y. We can find a point with max Y and some X in the middle.
min_x_all = min(p[0] for p in simplified)
max_x_all = max(p[0] for p in simplified)
max_y_all = max(p[1] for p in simplified)
mid_x = (min_x_all + max_x_all) / 2

start_idx = 0
min_dist = float('inf')
for i, p in enumerate(simplified):
    # Search for a point on the bottom straight near the middle
    d = (p[0] - mid_x)**2 + (p[1] - max_y_all)**2
    if d < min_dist:
        min_dist = d
        start_idx = i

simplified = simplified[start_idx:] + simplified[:start_idx]
if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

# Verify Racing Direction: Turn 1 is left, Turn 16 is right.
# Since we are on the bottom straight and need to head LEFT to Turn 1.
# The next few points should have a decreasing X value.
# Find the X direction for the first 10 points.
dx = simplified[10][0] - simplified[0][0]
if dx > 0:
    # We are heading right, so the contour was traced in the opposite direction. Reverse it.
    simplified = simplified[::-1]
    # Keep start/finish at index 0
    simplified = simplified[-1:] + simplified[:-1]

# Compute bounds
min_x = min(p[0] for p in simplified)
max_x = max(p[0] for p in simplified)
min_y = min(p[1] for p in simplified)
max_y = max(p[1] for p in simplified)

box_w = max_x - min_x
box_h = max_y - min_y

print(f"Detected Bounds: X:[{min_x}, {max_x}], Y:[{min_y}, {max_y}]")
print(f"Width: {box_w}, Height: {box_h}, Aspect: {box_w/box_h:.3f}")

# Normalize points
final_pts = [(p[0]-min_x, p[1]-min_y) for p in simplified]

# Generate SVG
d_str = f"M {final_pts[0][0]:.2f} {final_pts[0][1]:.2f}"
for p in final_pts[1:]:
    d_str += f" L {p[0]:.2f} {p[1]:.2f}"
d_str += " Z"

svg = f'''<svg viewBox="0 0 {box_w} {box_h}" xmlns="http://www.w3.org/2000/svg">
  <path d="{d_str}" />
</svg>'''

with open('src/assets/tracks/lusail.svg', 'w') as f:
    f.write(svg)
    
print("Wrote src/assets/tracks/lusail.svg")
