import cv2
import numpy as np
from skimage import morphology
import networkx as nx
import sys
import os

def extract_track(image_path, output_svg_path, output_img_path):
    print("Reading image...")
    img = cv2.imread(image_path)
    if img is None:
        print(f"Failed to load image: {image_path}")
        return

    # Extract Red using HSV for better robustness
    print("Thresholding red...")
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower1 = np.array([0, 70, 70])
    upper1 = np.array([15, 255, 255])
    lower2 = np.array([165, 70, 70])
    upper2 = np.array([180, 255, 255])
    mask = cv2.inRange(hsv, lower1, upper1) | cv2.inRange(hsv, lower2, upper2)

    # Morphological close to bridge gaps (like the checkered flag)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Keep largest connected component
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        print("No track found.")
        return
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    mask = (labels == largest_label)

    # Skeletonize
    print("Skeletonizing...")
    skeleton = morphology.skeletonize(mask)
    pts = np.argwhere(skeleton) # returns [y, x]

    # Graph and tracing
    print("Building graph...")
    G = nx.Graph()
    for i, p in enumerate(pts):
        G.add_node(i, pos=(p[1], p[0])) # x, y
    
    from scipy.spatial import cKDTree
    tree = cKDTree(pts)
    pairs = tree.query_pairs(r=np.sqrt(2.1)) # 8-connectivity
    G.add_edges_from(pairs)

    print(f"Graph nodes: {len(G.nodes)}, edges: {len(G.edges)}")

    # Extract the largest connected component of the skeleton
    largest_cc = max(nx.connected_components(G), key=len)
    G = G.subgraph(largest_cc).copy()

    print("Finding main track path...")
    cycles = nx.cycle_basis(G)
    
    if cycles:
        print("Closed loop detected.")
        longest_cycle = max(cycles, key=len)
        print(f"Longest cycle has {len(longest_cycle)} nodes.")
    else:
        print("No cycle found. The track has a gap. Finding the longest path (diameter) to close the loop.")
        start_node = list(G.nodes)[0]
        lengths = nx.single_source_shortest_path_length(G, start_node)
        node_A = max(lengths, key=lengths.get)
        
        lengths_from_A = nx.single_source_shortest_path_length(G, node_A)
        node_B = max(lengths_from_A, key=lengths_from_A.get)
        
        print(f"Found gap between nodes {node_A} and {node_B}. Track length: {lengths_from_A[node_B]}")
        longest_cycle = nx.shortest_path(G, node_A, node_B)
    
    ordered_pts = np.array([G.nodes[n]['pos'] for n in longest_cycle])

    # Downsample & Smooth
    print("Smoothing and downsampling...")
    n_pts = len(ordered_pts)
    
    # Calculate cumulative distance
    dists = np.sqrt(np.sum(np.diff(ordered_pts, axis=0)**2, axis=1))
    dists = np.append(dists, np.linalg.norm(ordered_pts[-1] - ordered_pts[0])) # close loop
    cum_dists = np.concatenate(([0], np.cumsum(dists)))
    total_dist = cum_dists[-1]
    
    target_pts = 240 # ~240 points is good for the game
    target_dists = np.linspace(0, total_dist, target_pts + 1)[:-1]
    
    resampled = np.zeros((target_pts, 2))
    resampled[:, 0] = np.interp(target_dists, cum_dists, np.append(ordered_pts[:, 0], ordered_pts[0, 0]))
    resampled[:, 1] = np.interp(target_dists, cum_dists, np.append(ordered_pts[:, 1], ordered_pts[0, 1]))

    # Minimal smoothing to retain exact shape while removing pixelation stairs
    window = 3
    smoothed = np.copy(resampled)
    for i in range(target_pts):
        idxs = [(i + j) % target_pts for j in range(-window//2 + 1, window//2 + 1)]
        smoothed[i] = np.mean(resampled[idxs], axis=0)

    final_pts = smoothed

    # Normalize Coordinates
    original_min_x = np.min(final_pts[:, 0])
    original_min_y = np.min(final_pts[:, 1])
    
    # Based on instructions: normalizedX = originalX - 258, normalizedY = originalY - 130
    normalized_pts = final_pts - np.array([258, 130])
    
    # Generate SVG
    print("Writing SVG...")
    svg_lines = []
    svg_lines.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 963 602">')
    
    path_d = f"M {normalized_pts[0,0]:.2f},{normalized_pts[0,1]:.2f}"
    for p in normalized_pts[1:]:
        path_d += f" L {p[0]:.2f},{p[1]:.2f}"
    path_d += " Z"
    
    svg_lines.append(f'<path d="{path_d}" fill="none" stroke="red" stroke-width="4"/>')
    svg_lines.append('</svg>')
    
    with open(output_svg_path, 'w') as f:
        f.write("\n".join(svg_lines))
        
    # Validation Overlay
    print("Writing validation overlay...")
    overlay = img.copy()
    # Draw original path as cyan
    for i in range(len(final_pts)):
        p1 = tuple(final_pts[i].astype(int))
        p2 = tuple(final_pts[(i+1)%len(final_pts)].astype(int))
        cv2.line(overlay, p1, p2, (255, 255, 0), 2)
        
    cv2.imwrite(output_img_path, overlay)
    print("Extraction successful.")
    print(f"Points: {len(final_pts)}")
    print(f"Bounds: minX={original_min_x}, minY={original_min_y}")
    
if __name__ == '__main__':
    img_path = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\.user_uploaded\media__1784864680658.jpg"
    out_svg = r"w:\sinhala-f1-podcast\src\assets\tracks\austria.svg"
    out_img = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\austria_overlay.jpg"
    extract_track(img_path, out_svg, out_img)
