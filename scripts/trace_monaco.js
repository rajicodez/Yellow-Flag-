import { Jimp } from 'jimp';

async function test() {
    const img = await Jimp.read('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\11715822-4b86-4f62-b347-9e10d681dc6b\\.user_uploaded\\media__1784821564499.jpg');
    const w = img.bitmap.width, h = img.bitmap.height;
    let grid = new Uint8Array(w * h);
    
    for(let y=0; y<h; y++){
        for(let x=0; x<w; x++){
            const idx = (y*w + x) * 4;
            const r = img.bitmap.data[idx];
            const g = img.bitmap.data[idx+1];
            const b = img.bitmap.data[idx+2];
            // lenient: R is highest, and > 100
            if (r > 100 && r > g + 20 && r > b + 20) {
                grid[y*w + x] = 1;
            }
        }
    }
    
    // Dilate heavily to close gaps
    for(let i=0; i<3; i++) {
        let grid2 = new Uint8Array(grid);
        for(let y=1; y<h-1; y++){
            for(let x=1; x<w-1; x++){
                if (grid[y*w + x]) {
                    grid2[(y-1)*w + x] = 1;
                    grid2[(y+1)*w + x] = 1;
                    grid2[y*w + x-1] = 1;
                    grid2[y*w + x+1] = 1;
                }
            }
        }
        grid = grid2;
    }

    let visited = new Uint8Array(w * h);
    let maxArea = 0, bestComp = [];
    for (let i = 0; i < w * h; i++) {
        if (grid[i] && !visited[i]) {
            let stack = [i], comp = [];
            visited[i] = 1;
            while(stack.length > 0) {
                let curr = stack.pop();
                comp.push(curr);
                let cx = curr % w, cy = Math.floor(curr / w);
                for(let dy=-1; dy<=1; dy++) {
                    for(let dx=-1; dx<=1; dx++) {
                        let nx = cx + dx, ny = cy + dy;
                        if (nx>=0 && nx<w && ny>=0 && ny<h) {
                            let nidx = ny * w + nx;
                            if (grid[nidx] && !visited[nidx]) {
                                visited[nidx] = 1; stack.push(nidx);
                            }
                        }
                    }
                }
            }
            if (comp.length > maxArea) { maxArea = comp.length; bestComp = comp; }
        }
    }
    grid.fill(0);
    for(let idx of bestComp) grid[idx] = 1;

    // Fill small holes inside the thick line
    for(let y=1; y<h-1; y++){
        for(let x=1; x<w-1; x++){
            if (!grid[y*w+x]) {
                let neighbors = grid[(y-1)*w+x] + grid[(y+1)*w+x] + grid[y*w+x-1] + grid[y*w+x+1];
                if (neighbors >= 3) grid[y*w+x] = 1;
            }
        }
    }

    // A simpler Edge Follower!
    // Since it's a solid thick shape with no gaps (due to heavy dilation),
    // we can just find the outer boundary!
    let startIdx = -1;
    for (let i = 0; i < w * h; i++) {
        if (grid[i]) { startIdx = i; break; }
    }
    
    // Moore Neighborhood Tracing
    // We go around the perimeter of the connected component!
    let path = [];
    let cx = startIdx % w, cy = Math.floor(startIdx / w);
    let startP = {x: cx, y: cy};
    let currP = {x: cx, y: cy};
    let dir = 0; // 0: up, 1: right, 2: down, 3: left
    const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
    
    let steps = 0;
    while(steps < 20000) {
        steps++;
        path.push(currP);
        
        let found = false;
        // Check neighbors in clockwise order starting from left of current direction
        let startDir = (dir + 3) % 4;
        for (let i = 0; i < 4; i++) {
            let d = (startDir + i) % 4;
            let nx = currP.x + dirs[d][0];
            let ny = currP.y + dirs[d][1];
            if (nx>=0 && nx<w && ny>=0 && ny<h && grid[ny*w+nx]) {
                currP = {x: nx, y: ny};
                dir = d;
                found = true;
                break;
            }
        }
        if (!found) break; // Isolated pixel
        
        if (currP.x === startP.x && currP.y === startP.y && steps > 10) {
            break; // Loop closed
        }
    }
    
    console.log(`Perimeter traced with ${path.length} pixels.`);
    
    let minX = Math.min(...path.map(p => p.x));
    let maxX = Math.max(...path.map(p => p.x));
    let minY = Math.min(...path.map(p => p.y));
    let maxY = Math.max(...path.map(p => p.y));
    
    console.log(`Bounds: X:[${minX}, ${maxX}], Y:[${minY}, ${maxY}]`);
    let boxW = maxX - minX;
    let boxH = maxY - minY;
    
    // Subsample
    let simplified = [];
    for(let i=0; i<path.length; i+=10) {
        simplified.push(path[i]);
    }
    
    let finalPoints = simplified.map(p => ({
        x: (p.x - minX) * (1210 / boxW),
        y: (p.y - minY) * (522 / boxH)
    }));
    
    let d = `M ${finalPoints[0].x.toFixed(1)},${finalPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < finalPoints.length; i++) {
        d += ` L ${finalPoints[i].x.toFixed(1)},${finalPoints[i].y.toFixed(1)}`;
    }
    d += ' Z';
    
    import('fs').then(fs => {
        let svgData = `<svg viewBox="0 0 1210 522" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">\n  <path d="${d}" />\n</svg>`;
        fs.writeFileSync('src/assets/tracks/monaco.svg', svgData);
        console.log("Wrote monaco.svg using perimeter tracing!");
    });
}
test();
