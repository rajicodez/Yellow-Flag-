import cv2
import numpy as np
from skimage import morphology
import networkx as nx

def check_winding(pts):
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

    b, g, r = cv2.split(img.astype(np.int32))
    
    red_mask = (
        (r > 150) & 
        (r > g * 1.5) & 
        (r > b * 1.4) & 
        (g < 150)
    ).astype(np.uint8) * 255
    
    pts_red = np.argwhere(red_mask > 0)
    print(f"Red pixels found: {len(pts_red)}")
    if len(pts_red) > 0:
        print(f"Mask bounds: minX={np.min(pts_red[:, 1])}, maxX={np.max(pts_red[:, 1])}, minY={np.min(pts_red[:, 0])}, maxY={np.max(pts_red[:, 0])}")

    # Baku's castle section is incredibly narrow. We MUST use a tiny kernel.
    kernel_size = 3
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    fused_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
    
    print("Skeletonizing...")
    skeleton = morphology.skeletonize(fused_mask > 0)
    pts = np.argwhere(skeleton)

    print("Building graph...")
    G = nx.Graph()
    for i, p in enumerate(pts):
        G.add_node(i, pos=(p[1], p[0]))
    
    from scipy.spatial import cKDTree
    tree = cKDTree(pts)
    pairs = tree.query_pairs(r=np.sqrt(2.1))
    G.add_edges_from(pairs)

    print(f"Graph nodes: {len(G.nodes)}, edges: {len(G.edges)}")

    print("Joining disconnected components...")
    while True:
        ccs = list(nx.connected_components(G))
        if len(ccs) <= 1:
            break
            
        endpoints = [n for n in G.nodes() if G.degree(n) <= 1]
        if len(endpoints) < 2:
            break
            
        best_pair = None
        min_dist = float('inf')
        
        for i in range(len(endpoints)):
            for j in range(i+1, len(endpoints)):
                u = endpoints[i]
                v = endpoints[j]
                
                u_comp = next(idx for idx, c in enumerate(ccs) if u in c)
                v_comp = next(idx for idx, c in enumerate(ccs) if v in c)
                
                if u_comp != v_comp:
                    pos_u = np.array(G.nodes[u]['pos'])
                    pos_v = np.array(G.nodes[v]['pos'])
                    dist = np.linalg.norm(pos_u - pos_v)
                    
                    if dist < min_dist:
                        min_dist = dist
                        best_pair = (u, v)
                        
        if best_pair:
            G.add_edge(best_pair[0], best_pair[1])
            print(f"Joined {best_pair[0]} and {best_pair[1]} (dist: {min_dist:.1f})")
        else:
            break

    largest_cc = max(nx.connected_components(G), key=len)
    G = G.subgraph(largest_cc).copy()

    print("Finding main track cycle (longest loop)...")
    cycles = nx.cycle_basis(G)
    
    longest_cycle = []
    if cycles:
        longest_cycle = max(cycles, key=len)
        print(f"Longest cycle found has {len(longest_cycle)} nodes.")
        
    if len(longest_cycle) > 500:
        print("Valid closed loop detected.")
        ordered_pts = np.array([G.nodes[n]['pos'] for n in longest_cycle])
    else:
        print("No valid large cycle found. Generating longest path...")
        start_node = list(G.nodes)[0]
        lengths = nx.single_source_shortest_path_length(G, start_node)
        node_A = max(lengths, key=lengths.get)
        lengths_from_A = nx.single_source_shortest_path_length(G, node_A)
        node_B = max(lengths_from_A, key=lengths_from_A.get)
        longest_path = nx.shortest_path(G, node_A, node_B)
        ordered_pts = np.array([G.nodes[n]['pos'] for n in longest_path])
        print(f"Longest path has {len(ordered_pts)} nodes. Automatically closing loop.")

    min_x = np.min(ordered_pts[:, 0])
    max_x = np.max(ordered_pts[:, 0])
    min_y = np.min(ordered_pts[:, 1])
    max_y = np.max(ordered_pts[:, 1])
    
    w = max_x - min_x
    h = max_y - min_y
    print(f"Circuit bounds: minX={min_x:.1f}, maxX={max_x:.1f}, minY={min_y:.1f}, maxY={max_y:.1f}")
    print(f"Circuit width: {w:.1f}, height: {h:.1f}")
    print(f"Aspect ratio: {w/h:.3f}")

    padding_x = w * 0.04
    padding_y = h * 0.04

    norm_min_x = min_x - padding_x
    norm_min_y = min_y - padding_y
    viewbox_w = w + (padding_x * 2)
    viewbox_h = h + (padding_y * 2)

    print(f"ViewBox: 0 0 {viewbox_w:.1f} {viewbox_h:.1f}")

    normalized_pts = ordered_pts - np.array([norm_min_x, norm_min_y])

    # Downsampling and smoothing
    # Baku is a street circuit, meaning sharp corners must be preserved. We will use a smaller window.
    print("Smoothing and downsampling...")
    dists = np.sqrt(np.sum(np.diff(normalized_pts, axis=0)**2, axis=1))
    dists = np.append(dists, np.linalg.norm(normalized_pts[-1] - normalized_pts[0]))
    cum_dists = np.concatenate(([0], np.cumsum(dists)))
    total_dist = cum_dists[-1]
    
    target_pts = 450
    target_dists = np.linspace(0, total_dist, target_pts + 1)[:-1]
    
    resampled = np.zeros((target_pts, 2))
    resampled[:, 0] = np.interp(target_dists, cum_dists, np.append(normalized_pts[:, 0], normalized_pts[0, 0]))
    resampled[:, 1] = np.interp(target_dists, cum_dists, np.append(normalized_pts[:, 1], normalized_pts[0, 1]))

    window = 3 # Very light smoothing for street circuits
    smoothed = np.copy(resampled)
    for i in range(target_pts):
        idxs = [(i + j) % target_pts for j in range(-window//2 + 1, window//2 + 1)]
        smoothed[i] = np.mean(resampled[idxs], axis=0)

    final_pts = smoothed

    # Enforce Anti-Clockwise for Baku
    is_cw = check_winding(final_pts)
    if is_cw:
        print("Path is clockwise. Reversing to make it anti-clockwise...")
        final_pts = final_pts[::-1]
    else:
        print("Path is correctly anti-clockwise.")
    
    # Baku's start/finish line is on the long horizontal straight across the middle-right area.
    # So we look for points with X > viewbox_w * 0.7 and Y around the middle (0.4 to 0.7).
    start_pts = np.argwhere(
        (final_pts[:, 0] > (viewbox_w * 0.7)) & 
        (final_pts[:, 1] > (viewbox_h * 0.4)) & 
        (final_pts[:, 1] < (viewbox_h * 0.7))
    ).flatten()
    if len(start_pts) > 0:
        # Sort by X to find the rightmost part, or just pick the middle of this straight
        mid_x = viewbox_w * 0.8
        best_idx = start_pts[np.argmin(np.abs(final_pts[start_pts, 0] - mid_x))]
        final_pts = np.roll(final_pts, -best_idx, axis=0)
        print("Successfully aligned start position.")
    else:
        print("Could not reliably align start position. Keeping default.")
    
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
        
    print("Writing validation overlay...")
    overlay = img.copy()
    for i in range(len(ordered_pts)):
        p1 = tuple(ordered_pts[i].astype(int))
        p2 = tuple(ordered_pts[(i+1)%len(ordered_pts)].astype(int))
        cv2.line(overlay, p1, p2, (255, 255, 0), 2)
        
    cv2.imwrite(output_img_path, overlay)
    print("Extraction successful.")
    
if __name__ == '__main__':
    img_path = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\.user_uploaded\media__1784900308469.jpg"
    out_svg = r"w:\sinhala-f1-podcast\src\assets\tracks\baku.svg"
    out_img = r"C:\Users\ASUS\.gemini\antigravity\brain\e94b5422-e6bd-4b92-a1e9-399841580f0f\baku_overlay.jpg"
    extract_track(img_path, out_svg, out_img)
