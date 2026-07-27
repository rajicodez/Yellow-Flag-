import cv2
import numpy as np
from scipy.interpolate import splprep, splev
import math

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

from skimage.morphology import skeletonize

# Skeletonize
skel = skeletonize(mask > 0)
y_idx, x_idx = np.where(skel)
points = list(zip(x_idx, y_idx))

if not points:
    print("No points found")
    exit()

def dist2(p1, p2):
    return (p1[0]-p2[0])**2 + (p1[1]-p2[1])**2

# Order points using greedy nearest neighbor
ordered = [points.pop(0)]
while points:
    last = ordered[-1]
    best_dist = float('inf')
    best_idx = -1
    for i, p in enumerate(points):
        d = dist2(last, p)
        if d < best_dist:
            best_dist = d
            best_idx = i
    ordered.append(points.pop(best_idx))

# Subsample contour to avoid too many points
subsampled = ordered[::15]
if len(subsampled) > 0 and dist2(subsampled[0], subsampled[-1]) > 50:
    subsampled.append(subsampled[0])
if len(subsampled) > 0 and dist2(subsampled[0], subsampled[-1]) > 50:
    subsampled.append(subsampled[0]) # close loop if not closed

# Smooth the points using splprep
x = [p[0] for p in subsampled]
y = [p[1] for p in subsampled]

tck, u = splprep([x, y], s=3.0, per=1)
u_new = np.linspace(0, 1, 240)
x_new, y_new = splev(u_new, tck)

smoothed_points = list(zip(x_new, y_new))[:-1] # remove last point as it duplicates the first

# Ensure counter-clockwise direction. 
# Sum over edges (x2-x1)(y2+y1). If > 0, it's clockwise, so reverse.
sum_edges = 0
for i in range(len(smoothed_points)):
    p1 = smoothed_points[i]
    p2 = smoothed_points[(i+1)%len(smoothed_points)]
    sum_edges += (p2[0] - p1[0]) * (p2[1] + p1[1])

if sum_edges > 0: # Clockwise in standard Cartesian, but in screen coords (y down), clockwise is negative sum. Wait.
    # In screen coords, (x2-x1)(y2+y1) > 0 means counter-clockwise?
    # Let's test a simple square: (0,0)->(1,0)->(1,1)->(0,1) -> (1)(0) + (0)(1) + (-1)(2) + (0)(1) = -2 < 0. That was CW visually (top-left origin).
    # So sum_edges < 0 is CW. We want CCW, so we want sum_edges > 0.
    # Actually let's just use polygon signed area:
    area = 0
    for i in range(len(smoothed_points)):
        p1 = smoothed_points[i]
        p2 = smoothed_points[(i+1)%len(smoothed_points)]
        area += p1[0]*p2[1] - p2[0]*p1[1]
    # area < 0 means clockwise in screen coords. We want CCW (area > 0).
    if area < 0:
        smoothed_points = smoothed_points[::-1]

# Now find the start/finish.
# In Interlagos, the SF straight is the long diagonal at the top.
# Let's find the longest mostly straight section with a negative slope (going up and left, or down and right).
# Since it's CCW, it should be going from top-right down to bottom-left? No, the pit straight goes down-left to Senna S.
# So we want the longest segment where dx < 0 and dy > 0.

# Let's find a point on the top-left diagonal.
# We can search for the point with the minimum X+Y value? Wait, top-left is min (X+Y). 
# But the pit straight spans a range. Let's find the minimum (X+Y) which would be near the start of the pit straight or Senna S.
min_xy_idx = -1
min_xy = float('inf')
for i, p in enumerate(smoothed_points):
    val = p[0] + p[1]
    if val < min_xy:
        min_xy = val
        min_xy_idx = i

# Shift array so min_xy_idx is 0
start_idx = min_xy_idx
smoothed_points = smoothed_points[start_idx:] + smoothed_points[:start_idx]

# Let's adjust slightly: the start finish line is exactly in the middle of that long straight.
# Let's just use the current index as a proxy and we can adjust later if needed.

# We also need to scale the points so they match the canvas. The current SVG might be around 1000x1000 or similar.
# The red image is 700x438. We will center it and scale it to fit a 1200x800 box.
min_x = min(p[0] for p in smoothed_points)
max_x = max(p[0] for p in smoothed_points)
min_y = min(p[1] for p in smoothed_points)
max_y = max(p[1] for p in smoothed_points)

cx = (min_x + max_x) / 2
cy = (min_y + max_y) / 2

# Scale
scale = min(1000 / (max_x - min_x), 700 / (max_y - min_y))
final_points = []
for p in smoothed_points:
    nx = (p[0] - cx) * scale + 600
    ny = (p[1] - cy) * scale + 400
    final_points.append((nx, ny))

# Check for self-intersections
def line_intersection(p1, p2, p3, p4):
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

intersections = 0
n = len(final_points)
for i in range(n):
    p1 = final_points[i]
    p2 = final_points[(i+1)%n]
    for j in range(i+2, n):
        if i == 0 and j == n-1:
            continue # Last edge connects to first
        p3 = final_points[j]
        p4 = final_points[(j+1)%n]
        if line_intersection(p1, p2, p3, p4):
            intersections += 1

print(f"Self-intersections: {intersections}")

# Clearance test
min_clearance = float('inf')
for i in range(n):
    p1 = final_points[i]
    for j in range(i+20, n-20): # Only non-local segments
        p2 = final_points[j]
        d = math.hypot(p1[0]-p2[0], p1[1]-p2[1])
        if d < min_clearance:
            min_clearance = d

print(f"Minimum clearance: {min_clearance:.2f}")

path_data = "M " + " L ".join([f"{x:.2f} {y:.2f}" for x, y in final_points]) + " Z"

with open('src/assets/tracks/brazil.svg', 'w') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">\n  <path d="{path_data}" fill="none" stroke="red" stroke-width="2"/>\n</svg>')

print("Saved src/assets/tracks/brazil.svg")
