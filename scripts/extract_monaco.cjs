const Jimp = require('jimp');
const fs = require('fs');

async function extract() {
    console.log("Loading image...");
    const img = await Jimp.read('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\11715822-4b86-4f62-b347-9e10d681dc6b\\.user_uploaded\\media__1784821564499.jpg');
    
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    console.log(`Image size: ${w}x${h}`);

    let grid = new Uint8Array(w * h);
    
    // 1. Threshold
    console.log("Thresholding red pixels...");
    for(let y=0; y<h; y++){
        for(let x=0; x<w; x++){
            const idx = (y*w + x) * 4;
            const r = img.bitmap.data[idx];
            const g = img.bitmap.data[idx+1];
            const b = img.bitmap.data[idx+2];
            
            // Bright red, significantly greater than G and B, avoiding white/grey
            if (r > 120 && r - g > 50 && r - b > 50 && g < 150 && b < 150) {
                grid[y*w + x] = 1;
            }
        }
    }

    // 2. Largest Connected Component
    console.log("Finding largest connected component...");
    let visited = new Uint8Array(w * h);
    let maxArea = 0;
    let bestComp = [];
    
    for (let i = 0; i < w * h; i++) {
        if (grid[i] && !visited[i]) {
            let stack = [i];
            let comp = [];
            visited[i] = 1;
            while(stack.length > 0) {
                let curr = stack.pop();
                comp.push(curr);
                let cx = curr % w;
                let cy = Math.floor(curr / w);
                
                for(let dy=-1; dy<=1; dy++) {
                    for(let dx=-1; dx<=1; dx++) {
                        let nx = cx + dx;
                        let ny = cy + dy;
                        if (nx>=0 && nx<w && ny>=0 && ny<h) {
                            let nidx = ny * w + nx;
                            if (grid[nidx] && !visited[nidx]) {
                                visited[nidx] = 1;
                                stack.push(nidx);
                            }
                        }
                    }
                }
            }
            if (comp.length > maxArea) {
                maxArea = comp.length;
                bestComp = comp;
            }
        }
    }
    
    console.log("Largest component size:", maxArea);
    grid.fill(0);
    for(let idx of bestComp) grid[idx] = 1;

    // 3. Zhang-Suen Thinning
    console.log("Skeletonizing (Zhang-Suen)...");
    let count = 1;
    let iter = 0;
    while(count > 0) {
        count = 0;
        iter++;
        
        let toClear = [];
        // Step 1
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let idx = y * w + x;
                if (!grid[idx]) continue;
                
                let p2 = grid[(y-1)*w + x];
                let p3 = grid[(y-1)*w + x+1];
                let p4 = grid[y*w + x+1];
                let p5 = grid[(y+1)*w + x+1];
                let p6 = grid[(y+1)*w + x];
                let p7 = grid[(y+1)*w + x-1];
                let p8 = grid[y*w + x-1];
                let p9 = grid[(y-1)*w + x-1];
                
                let A = 0;
                if (p2 == 0 && p3 == 1) A++;
                if (p3 == 0 && p4 == 1) A++;
                if (p4 == 0 && p5 == 1) A++;
                if (p5 == 0 && p6 == 1) A++;
                if (p6 == 0 && p7 == 1) A++;
                if (p7 == 0 && p8 == 1) A++;
                if (p8 == 0 && p9 == 1) A++;
                if (p9 == 0 && p2 == 1) A++;
                
                let B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                
                if (A == 1 && (B >= 2 && B <= 6) && (p2 * p4 * p6 == 0) && (p4 * p6 * p8 == 0)) {
                    toClear.push(idx);
                }
            }
        }
        for(let idx of toClear) grid[idx] = 0;
        count += toClear.length;
        
        toClear = [];
        // Step 2
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let idx = y * w + x;
                if (!grid[idx]) continue;
                
                let p2 = grid[(y-1)*w + x];
                let p3 = grid[(y-1)*w + x+1];
                let p4 = grid[y*w + x+1];
                let p5 = grid[(y+1)*w + x+1];
                let p6 = grid[(y+1)*w + x];
                let p7 = grid[(y+1)*w + x-1];
                let p8 = grid[y*w + x-1];
                let p9 = grid[(y-1)*w + x-1];
                
                let A = 0;
                if (p2 == 0 && p3 == 1) A++;
                if (p3 == 0 && p4 == 1) A++;
                if (p4 == 0 && p5 == 1) A++;
                if (p5 == 0 && p6 == 1) A++;
                if (p6 == 0 && p7 == 1) A++;
                if (p7 == 0 && p8 == 1) A++;
                if (p8 == 0 && p9 == 1) A++;
                if (p9 == 0 && p2 == 1) A++;
                
                let B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                
                if (A == 1 && (B >= 2 && B <= 6) && (p2 * p4 * p8 == 0) && (p2 * p6 * p8 == 0)) {
                    toClear.push(idx);
                }
            }
        }
        for(let idx of toClear) grid[idx] = 0;
        count += toClear.length;
    }
    console.log(`Thinning complete after ${iter} iterations.`);

    // 4. Prune Spurs (Remove endpoints iteratively)
    console.log("Pruning spurs...");
    let pruned = 1;
    while(pruned > 0) {
        pruned = 0;
        let toClear = [];
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let idx = y * w + x;
                if (!grid[idx]) continue;
                
                let neighbors = 
                    grid[(y-1)*w + x] + grid[(y-1)*w + x+1] + 
                    grid[y*w + x+1] + grid[(y+1)*w + x+1] + 
                    grid[(y+1)*w + x] + grid[(y+1)*w + x-1] + 
                    grid[y*w + x-1] + grid[(y-1)*w + x-1];
                
                if (neighbors <= 1) {
                    toClear.push(idx);
                }
            }
        }
        for(let idx of toClear) grid[idx] = 0;
        pruned = toClear.length;
    }

    // 5. Trace the loop
    console.log("Tracing closed loop...");
    let startIdx = -1;
    for (let i = 0; i < w * h; i++) {
        if (grid[i]) {
            startIdx = i;
            break;
        }
    }
    
    if (startIdx === -1) {
        console.error("No loop found!");
        return;
    }

    let path = [];
    let currentIdx = startIdx;
    
    // To trace properly, we mark as visited.
    let traceVisited = new Uint8Array(w * h);
    traceVisited[currentIdx] = 1;
    
    while(true) {
        let cx = currentIdx % w;
        let cy = Math.floor(currentIdx / w);
        path.push({x: cx, y: cy});
        
        let foundNext = false;
        // Search 8-neighbors
        let neighbors = [
            [-1, 0], [-1, -1], [0, -1], [1, -1], 
            [1, 0], [1, 1], [0, 1], [-1, 1]
        ];
        
        for (let n of neighbors) {
            let nx = cx + n[0];
            let ny = cy + n[1];
            let nidx = ny * w + nx;
            if (grid[nidx] && !traceVisited[nidx]) {
                currentIdx = nidx;
                traceVisited[currentIdx] = 1;
                foundNext = true;
                break; // move to first unvisited neighbor
            }
        }
        
        if (!foundNext) {
            break; // hit the end (or closed loop)
        }
    }

    console.log(`Path traced with ${path.length} pixels.`);

    // 6. Subsample & Smooth
    let simplified = [];
    const step = 6; // Take every 6th pixel for better precision
    for(let i=0; i<path.length; i+=step) {
        simplified.push(path[i]);
    }
    // Make sure we close the loop nicely
    simplified.push(path[0]);

    // 7. Extract Bounds & Normalize
    let minX = Math.min(...simplified.map(p => p.x));
    let maxX = Math.max(...simplified.map(p => p.x));
    let minY = Math.min(...simplified.map(p => p.y));
    let maxY = Math.max(...simplified.map(p => p.y));
    
    let boxW = maxX - minX;
    let boxH = maxY - minY;
    
    console.log(`Detected Bounds: X:[${minX}, ${maxX}], Y:[${minY}, ${maxY}]`);
    console.log(`Width: ${boxW}, Height: ${boxH}, Aspect: ${(boxW/boxH).toFixed(3)}`);
    
    // Transform coordinates for final SVG Output
    let finalPoints = simplified.map(p => ({
        x: p.x - minX,
        y: p.y - minY
    }));

    // Construct SVG string
    let d = `M ${finalPoints[0].x},${finalPoints[0].y}`;
    for (let i = 1; i < finalPoints.length; i++) {
        d += ` L ${finalPoints[i].x},${finalPoints[i].y}`;
    }
    d += ' Z';

    let svgData = `<svg viewBox="0 0 ${boxW} ${boxH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <path d="${d}" />
</svg>`;

    fs.writeFileSync('src/assets/tracks/monaco.svg', svgData);
    console.log("Wrote src/assets/tracks/monaco.svg");

    // Output raw path data for validation overlay
    let outData = {
        minX, maxX, minY, maxY, boxW, boxH,
        rawPixels: simplified
    };
    
    fs.writeFileSync('public/debug_monaco.json', JSON.stringify(outData, null, 2));
    console.log("Wrote public/debug_monaco.json");
}

extract().catch(console.error);
