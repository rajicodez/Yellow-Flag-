import cv2
import numpy as np
from skimage import morphology
import networkx as nx

def check_winding(pts):
    # Shoelace Area for Y-down coordinates
    # Negative area -> counter-clockwise. Positive -> clockwise.
    area = 0
    for i in range(len(pts)):
        p1 = pts[i]
        p2 = pts[(i+1)%len(pts)]
        area += (p1[0]*p2[1] - p2[0]*p1[1])
    return area > 0

def extract_track(image_path, output_svg_path, output_img_path):
    print("Reading image...")
    img = cv2.imread(image_path)
    if img is None:
        print(f"Failed to load image: {image_path}")
        return

    # Convert to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # The road is a grey corridor. We extract pixels with low saturation (gray/white/black)
    # and intermediate value (not pure white, not pure black).
    # Typical gray road: V is roughly 100-220. S is very low (0-30).
    lower_gray = np.array([0, 0, 100])
    upper_gray = np.array([180, 40, 220])
    mask_gray = cv2.inRange(hsv, lower_gray, upper_gray)

    print("Bridging gaps (text, sector lines, annotations)...")
    # Apply morphological closing to bridge the gaps where text or colored lines intersect the track.
    kernel_size = 21
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    fused_mask = cv2.morphologyEx(mask_gray, cv2.MORPH_CLOSE, kernel)

    # Keep largest connected component to remove random gray logos or text outside the track
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fused_mask, connectivity=8)
    if num_labels <= 1:
        print("No track found.")
        return
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    clean_mask = (labels == largest_label)

    # Fill any remaining small holes within the road corridor
    clean_mask = morphology.remove_small_holes(clean_mask, max_size=10000)

    # Skeletonize to get the exact medial axis (centerline)
    print("Skeletonizing...")
    skeleton = morphology.skeletonize(clean_mask)
    pts = np.argwhere(skeleton) # [y, x]

    # Build Graph
    print("Building graph...")
    G = nx.Graph()
    for i, p in enumerate(pts):
        G.add_node(i, pos=(p[1], p[0])) # x, y
    
    from scipy.spatial import cKDTree
    tree = cKDTree(pts)
    pairs = tree.query_pairs(r=np.sqrt(2.1)) # 8-connectivity
    G.add_edges_from(pairs)

    print(f"Graph nodes: {len(G.nodes)}, edges: {len(G.edges)}")

    # Extract largest connected component
    largest_cc = max(nx.connected_components(G), key=len)
    G = G.subgraph(largest_cc).copy()

    print("Finding main track cycle (longest loop)...")
    cycles = nx.cycle_basis(G)
    
    if cycles:
        longest_cycle = max(cycles, key=len)
        print(f"Closed loop detected. Longest cycle has {len(longest_cycle)} nodes.")
    else:
        print("No cycle found. Path is not closed. Generating longest path...")
        start_node = list(G.nodes)[0]
        lengths = nx.single_source_shortest_path_length(G, start_node)
        node_A = max(lengths, key=lengths.get)
        lengths_from_A = nx.single_source_shortest_path_length(G, node_A)
        node_B = max(lengths_from_A, key=lengths_from_A.get)
        longest_cycle = nx.shortest_path(G, node_A, node_B)
    
    ordered_pts = np.array([G.nodes[n]['pos'] for n in longest_cycle])

    # Calculate exact bounds
    min_x = np.min(ordered_pts[:, 0])
    max_x = np.max(ordered_pts[:, 0])
    min_y = np.min(ordered_pts[:, 1])
    max_y = np.max(ordered_pts[:, 1])
    
    w = max_x - min_x
    h = max_y - min_y
    print(f"Circuit bounds: minX={min_x:.1f}, maxX={max_x:.1f}, minY={min_y:.1f}, maxY={max_y:.1f}")
    print(f"Aspect ratio: {w/h:.3f}")

    # Padding calculation (3-5%)
    padding_x = w * 0.04
    padding_y = h * 0.04

    norm_min_x = min_x - padding_x
    norm_min_y = min_y - padding_y
    viewbox_w = w + (padding_x * 2)
    viewbox_h = h + (padding_y * 2)

    print(f"ViewBox: 0 0 {viewbox_w:.1f} {viewbox_h:.1f}")

    # Normalize extracted points using: normalizedX = originalX - minX; normalizedY = originalY - minY;
    normalized_pts = ordered_pts - np.array([norm_min_x, norm_min_y])

    # Downsampling and smoothing
    print("Smoothing and downsampling...")
    dists = np.sqrt(np.sum(np.diff(normalized_pts, axis=0)**2, axis=1))
    dists = np.append(dists, np.linalg.norm(normalized_pts[-1] - normalized_pts[0]))
    cum_dists = np.concatenate(([0], np.cumsum(dists)))
    total_dist = cum_dists[-1]
    
    target_pts = 350
    target_dists = np.linspace(0, total_dist, target_pts + 1)[:-1]
    
    resampled = np.zeros((target_pts, 2))
    resampled[:, 0] = np.interp(target_dists, cum_dists, np.append(normalized_pts[:, 0], normalized_pts[0, 0]))
    resampled[:, 1] = np.interp(target_dists, cum_dists, np.append(normalized_pts[:, 1], normalized_pts[0, 1]))

    window = 5
    smoothed = np.copy(resampled)
    for i in range(target_pts):
        idxs = [(i + j) % target_pts for j in range(-window//2 + 1, window//2 + 1)]
        smoothed[i] = np.mean(resampled[idxs], axis=0)

    final_pts = smoothed

    # Enforce Clockwise (Hungaroring runs clockwise)
    is_cw = check_winding(final_pts)
    if not is_cw:
        print("Path is counter-clockwise. Reversing to make it clockwise...")
        final_pts = final_pts[::-1]
    
    # Generate SVG (valid L, Z commands, starts with M)
    print("Writing SVG...")
    svg_lines = []
    svg_lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {viewbox_w:.1f} {viewbox_h:.1f}">')
    
    path_d = f"M {final_pts[0,0]:.2f},{final_pts[0,1]:.2f}"
    for p in final_pts[1:]:
        path_d += f" L {p[0]:.2f},{p[1]:.2f}"
    path_d += " Z"
    
    svg_lines.append(f'<path d="{path_d}" fill="none" stroke="red" stroke-width="4"/>')
    svg_lines.append('</svg>')
    
    with open(output_svg_path, 'w') as f:
        f.write("\n".join(svg_lines))
        
    # Validation Overlay
    print("Writing validation overlay...")
    overlay = img.copy()
    # Draw original path as bright green over the native image
    for i in range(len(ordered_pts)):
        p1 = tuple(ordered_pts[i].astype(int))
        p2 = tuple(ordered_pts[(i+1)%len(ordered_pts)].astype(int))
        cv2.line(overlay, p1, p2, (0, 255, 0), 3)
        
    cv2.imwrite(output_img_path, overlay)
    print("Extraction successful.")
    
if __name__ == '__main__':
    img_path = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\.user_uploaded\media__1784890145148.jpg"
    out_svg = r"w:\sinhala-f1-podcast\src\assets\tracks\hungary.svg"
    out_img = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\hungary_overlay.jpg"
    extract_track(img_path, out_svg, out_img)
