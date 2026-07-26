import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785053040202.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

if img is None:
    print("Failed to load image.")
    exit(1)

# The track is very dark/black. Background is white, text/accents are colorful.
# RGB < 60 and Alpha > 200 will isolate the track.
if len(img.shape) == 3 and img.shape[2] == 4:
    b, g, r, a = cv2.split(img)
    mask = ((r < 60) & (g < 60) & (b < 60) & (a > 200)).astype(np.uint8) * 255
else:
    b, g, r = cv2.split(img)
    mask = ((r < 60) & (g < 60) & (b < 60)).astype(np.uint8) * 255

# Closing to fill holes
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

# Start/finish line for Yas Marina:
# It's on the central vertical straight. 
# Looking at the image, Turn 1 is bottom center. Turn 16 is above it.
# The straight is between Turn 16 and Turn 1.
# It should be on a vertical line. Let's find a point where x is near the center, and y is near the center.
min_x_all = min(p[0] for p in simplified)
max_x_all = max(p[0] for p in simplified)
min_y_all = min(p[1] for p in simplified)
max_y_all = max(p[1] for p in simplified)

# The central straight is slightly to the right of the middle (if left is Turn 9 and right is Turn 5).
# Let's target a point like x = max_x_all - (width * 0.4), y = max_y_all - (height * 0.4).
target_x = max_x_all - (max_x_all - min_x_all) * 0.4
target_y = max_y_all - (max_y_all - min_y_all) * 0.4

start_idx = 0
min_dist = float('inf')
for i, p in enumerate(simplified):
    d = (p[0] - target_x)**2 + (p[1] - target_y)**2
    if d < min_dist:
        min_dist = d
        start_idx = i

# Reorder
simplified = simplified[start_idx:] + simplified[:start_idx]
if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

# Verify Racing Direction: The start finish straight goes SOUTH (increasing Y) towards Turn 1.
# So the first few points should have an increasing Y value.
dy = simplified[10][1] - simplified[0][1]
if dy < 0:
    # We are heading north, so the contour was traced backwards. Reverse it.
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

with open('src/assets/tracks/abu-dhabi.svg', 'w') as f:
    f.write(svg)
    
print("Wrote src/assets/tracks/abu-dhabi.svg")
