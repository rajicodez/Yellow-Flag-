import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785075971406.png'
img = cv2.imread(img_path)

if img is None:
    print("Failed to load image.")
    exit()

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Extract red pixels
lower_red1 = np.array([0, 100, 100])
upper_red1 = np.array([10, 255, 255])
mask1 = cv2.inRange(hsv, lower_red1, upper_red1)

lower_red2 = np.array([170, 100, 100])
upper_red2 = np.array([180, 255, 255])
mask2 = cv2.inRange(hsv, lower_red2, upper_red2)

mask = mask1 + mask2

# Use skeletonization or just thinning to get a clean path
# Actually, grid subsampling works better
h, w = mask.shape
grid_size = 5
points = []
for y in range(0, h, grid_size):
    for x in range(0, w, grid_size):
        roi = mask[y:y+grid_size, x:x+grid_size]
        if np.sum(roi) > 255 * (grid_size * grid_size * 0.1): # At least 10% red
            cy, cx = np.where(roi > 0)
            avg_x = x + np.mean(cx)
            avg_y = y + np.mean(cy)
            points.append((avg_x, avg_y))

if not points:
    print("No points found.")
    exit()

# TSP to order the points
ordered = [points[0]]
points.pop(0)

while points:
    last = ordered[-1]
    # Find nearest
    best_dist = float('inf')
    best_idx = -1
    for i, p in enumerate(points):
        d = (p[0]-last[0])**2 + (p[1]-last[1])**2
        if d < best_dist:
            best_dist = d
            best_idx = i
    ordered.append(points.pop(best_idx))

# Start/Finish is on the upper left straight. It's the longest diagonal.
# We'll output the ordered points, then we can find the start finish and rotate the array.
path_data = "M " + " L ".join([f"{x:.2f} {y:.2f}" for x, y in ordered]) + " Z"
print("SVG Path length:", len(ordered))

# Save to svg file for preview
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">
  <path d="{path_data}" fill="none" stroke="red" stroke-width="2"/>
</svg>'''

with open('brazil_extracted.svg', 'w') as f:
    f.write(svg_content)

print("Saved brazil_extracted.svg")
