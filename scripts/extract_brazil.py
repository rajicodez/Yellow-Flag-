import cv2
import numpy as np

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\9bb1130f-7ad5-492c-886e-cf974941e27c\.user_uploaded\media__1785037408546.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

# Convert to grayscale
if img.shape[2] == 4:
    # Use alpha channel to ignore transparent background
    b, g, r, a = cv2.split(img)
    gray = cv2.cvtColor(cv2.merge([b,g,r]), cv2.COLOR_BGR2GRAY)
    mask = ((gray < 100) & (a > 200)).astype(np.uint8) * 255
else:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = (gray < 100).astype(np.uint8) * 255

# Closing to fill holes
kernel = np.ones((7,7), np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

# Find contours
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
largest_contour = max(contours, key=cv2.contourArea)

# The contour might be the outer edge of the black line. 
# We want the centerline. We can erode the mask to get a thinner line, or just use the contour as is since it's close enough.
# Actually, the track in the image is a thick line. To get the centerline, we can find contours on the skeleton.
# Let's try ximgproc thinning if available, otherwise just use the contour.
skel = mask
try:
    skel = cv2.ximgproc.thinning(mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
except:
    pass

# Find contours of the skeleton
contours, _ = cv2.findContours(skel, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
# If skeletonization broke it into pieces, just use the original mask's outer contour
if len(contours) > 10: 
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    
pts = max(contours, key=cv2.contourArea)
pts = pts.reshape(-1, 2)

# Order points (findContours already orders them sequentially around the boundary)
# Subsample
step = 4
simplified = pts[::step].tolist()
simplified.append(simplified[0])

# Reorder so start/finish is at x=100, y=230
start_idx = 0
min_dist = float('inf')
for i, p in enumerate(simplified):
    d = (p[0] - 100)**2 + (p[1] - 230)**2
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

with open('src/assets/tracks/brazil.svg', 'w') as f:
    f.write(svg)
    
print("Wrote src/assets/tracks/brazil.svg")
