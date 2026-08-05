import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785065430210.jpg'
img = cv2.imread(img_path)

if img is None:
    print("Failed to load image.")
    exit(1)

# Extract the red line
# Red is typically BGR: B<100, G<100, R>150
b, g, r = cv2.split(img)
mask = ((r > 150) & (g < 100) & (b < 100)).astype(np.uint8) * 255

# Fill holes
kernel = np.ones((3,3), np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

# Keep largest component
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
mask = (labels == largest_label).astype(np.uint8) * 255

# Instead of ximgproc thinning, let's just grid-sample the mask to get points
h, w = mask.shape
grid_size = 5
points = []
for y in range(0, h, grid_size):
    for x in range(0, w, grid_size):
        roi = mask[y:y+grid_size, x:x+grid_size]
        if np.count_nonzero(roi) > 0:
            # find centroid
            my, mx = np.where(roi > 0)
            cy = y + np.mean(my)
            cx = x + np.mean(mx)
            points.append((cx, cy))

if not points:
    print("No points found")
    exit(1)

# Order points by nearest neighbor to form a loop
ordered_points = [points.pop(0)]
while points:
    last = ordered_points[-1]
    # Find closest point
    min_dist = float('inf')
    best_idx = 0
    for i, p in enumerate(points):
        d = (p[0]-last[0])**2 + (p[1]-last[1])**2
        if d < min_dist:
            min_dist = d
            best_idx = i
            
    ordered_points.append(points.pop(best_idx))

# Simplify the path using Ramer-Douglas-Peucker or just subsampling
# Actually, let's just do a simple subsample to smooth it out
step = 4
simplified = ordered_points[::step]
if simplified[-1] != simplified[0]:
    simplified.append(simplified[0])

# Smooth with a moving average to remove pixelation staircases
window = 3
smoothed = []
n = len(simplified)
for i in range(n):
    sx = sum(simplified[(i+j)%n][0] for j in range(-window, window+1))
    sy = sum(simplified[(i+j)%n][1] for j in range(-window, window+1))
    smoothed.append((sx / (2*window+1), sy / (2*window+1)))

# Ensure closure
if smoothed[-1] != smoothed[0]:
    smoothed.append(smoothed[0])

# Determine start/finish line. It's on the leftmost straight, facing North-East.
# Find the point with minimum X (Anthony Noghes / Start Finish area). 
# Actually, the start finish is halfway up that left straight.
# Let's find the bounding box to orient ourselves.
min_x = min(p[0] for p in smoothed)
max_x = max(p[0] for p in smoothed)
min_y = min(p[1] for p in smoothed)
max_y = max(p[1] for p in smoothed)

# Let's pick a point on the far left.
# In Monaco, T1 (Sainte Devote) is at the top left. Anthony Noghes (T19) is bottom left.
# The start finish straight is the left-most edge.
# Find the point with the minimum X.
start_idx = 0
min_x_val = float('inf')
for i, p in enumerate(smoothed):
    if p[0] < min_x_val:
        min_x_val = p[0]
        start_idx = i

# Reorder so start is at the far left
smoothed = smoothed[start_idx:] + smoothed[:start_idx]
if smoothed[-1] != smoothed[0]:
    smoothed.append(smoothed[0])

# Verify clockwise direction: from the far left (which is somewhere around Anthony Noghes or Pit Straight),
# going clockwise means Y should be DECREASING (going UP towards Sainte Devote).
dy = smoothed[5][1] - smoothed[0][1]
if dy > 0:
    # Going down, meaning counter-clockwise. Reverse it.
    smoothed = smoothed[::-1]
    smoothed = smoothed[-1:] + smoothed[:-1] # Keep the same start point

box_w = max_x - min_x
box_h = max_y - min_y

print(f"Detected Bounds: X:[{min_x}, {max_x}], Y:[{min_y}, {max_y}]")
print(f"Width: {box_w}, Height: {box_h}, Aspect: {box_w/box_h:.3f}")

final_pts = [(p[0]-min_x, p[1]-min_y) for p in smoothed]

d_str = f"M {final_pts[0][0]:.2f} {final_pts[0][1]:.2f}"
for p in final_pts[1:]:
    d_str += f" L {p[0]:.2f} {p[1]:.2f}"
d_str += " Z"

svg = f'''<svg viewBox="0 0 {box_w} {box_h}" xmlns="http://www.w3.org/2000/svg">
  <path d="{d_str}" />
</svg>'''

with open('src/assets/tracks/monaco.svg', 'w') as f:
    f.write(svg)
    
print("Wrote src/assets/tracks/monaco.svg")
