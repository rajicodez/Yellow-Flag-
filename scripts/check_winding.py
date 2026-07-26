import xml.etree.ElementTree as ET
import numpy as np
import re

def check_and_fix_winding(svg_file):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    path = root.find('.//{http://www.w3.org/2000/svg}path')
    if path is None:
        return
    d = path.attrib['d']
    
    # Parse points
    tokens = re.split(r'[ ,]+', d.replace('M', '').replace('L', '').replace('Z', '').strip())
    pts = []
    for i in range(0, len(tokens)-1, 2):
        if tokens[i] and tokens[i+1]:
            pts.append([float(tokens[i]), float(tokens[i+1])])
    pts = np.array(pts)
    
    # Calculate signed area
    # In Y-down coordinates, clockwise means negative signed area if using standard cross product, 
    # or positive if we use standard formula sum((x2-x1)*(y2+y1))
    area = 0
    for i in range(len(pts)):
        p1 = pts[i]
        p2 = pts[(i+1)%len(pts)]
        area += (p2[0] - p1[0]) * (p2[1] + p1[1])
        
    print(f"Signed area (y-down sum(dx*sy)): {area}")
    
    # Let's confirm with standard math:
    # A standard clockwise polygon in Y-down has area < 0 for (x_i * y_i+1 - x_i+1 * y_i)
    area2 = 0
    for i in range(len(pts)):
        p1 = pts[i]
        p2 = pts[(i+1)%len(pts)]
        area2 += (p1[0]*p2[1] - p2[0]*p1[1])
        
    print(f"Shoelace Area (x1*y2 - x2*y1): {area2}")
    
    # If Shoelace area in Y-down is NEGATIVE, it is counter-clockwise.
    # If Shoelace area in Y-down is POSITIVE, it is clockwise.
    # Let's verify: Top-left(0,0), Top-right(1,0), Bottom-right(1,1), Bottom-left(0,1)
    # Clockwise: (0,0)->(1,0)->(1,1)->(0,1)
    # 0*0-1*0 = 0
    # 1*1-1*0 = 1
    # 1*1-0*1 = 1
    # 0*0-0*1 = 0
    # Sum = 2 (Positive)
    # So if area2 < 0, it is counter-clockwise and we must reverse!
    
    if area2 < 0:
        print("Reversing path to make it clockwise...")
        pts = pts[::-1]
        
        path_d = f"M {pts[0,0]:.2f},{pts[0,1]:.2f}"
        for p in pts[1:]:
            path_d += f" L {p[0]:.2f},{p[1]:.2f}"
        path_d += " Z"
        
        path.attrib['d'] = path_d
        tree.write(svg_file)
        print("Done.")
    else:
        print("Path is already clockwise.")

if __name__ == "__main__":
    check_and_fix_winding(r"w:\sinhala-f1-podcast\src\assets\tracks\austria.svg")
