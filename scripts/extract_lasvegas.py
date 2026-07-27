import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785049029627.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

if img is None:
    print("Failed to load image.")
    exit(1)

# Convert to grayscale and threshold
if len(img.shape) == 3 and img.shape[2] == 4:
    b, g, r, a = cv2.split(img)
    # The road is very dark, so RGB < 80 should isolate it from the white/grey background 
    # and brightly colored edge lines (red/cyan/yellow)
    mask = ((r < 80) & (g < 80) & (b < 80) & (a > 200)).astype(np.uint8) * 255
else:
    b, g, r = cv2.split(img)
    mask = ((r < 80) & (g < 80) & (b < 80)).astype(np.uint8) * 255

# Closing to fill holes (e.g. if there's any small artifacts in the middle)
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

# Ensure closure
if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

# We need the start line on the diagonal top-right section (Turn 17 to Turn 1)
# Top-right is high X, low Y. The diagonal goes roughly from (max_x, 150) to (max_x-100, 50).
# Let's find a point with X > max_x - 150 and Y < min_y + 150
max_x_pts = max(p[0] for p in simplified)
min_y_pts = min(p[1] for p in simplified)

start_idx = 0
min_dist = float('inf')
# target_pt = (max_x_pts - 50, min_y_pts + 50)
target_pt = (max_x_pts - 80, min_y_pts + 80)

for i, p in enumerate(simplified):
    d = (p[0] - target_pt[0])**2 + (p[1] - target_pt[1])**2
    if d < min_dist:
        min_dist = d
        start_idx = i

simplified = simplified[start_idx:] + simplified[:start_idx]
if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

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

with open('src/assets/tracks/las-vegas.svg', 'w') as f:
    f.write(svg)
    
print("Wrote src/assets/tracks/las-vegas.svg")
