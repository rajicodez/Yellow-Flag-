import { Jimp } from 'jimp';
import fs from 'fs';

async function extract() {
    console.log("Loading image...");
    const img = await Jimp.read('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\11715822-4b86-4f62-b347-9e10d681dc6b\\.user_uploaded\\media__1784821564499.jpg');
    
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    console.log(`Image size: ${w}x${h}`);

    let grid = new Uint8Array(w * h);
    
    // 1. Threshold - very lenient for red
    console.log("Thresholding red pixels...");
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

    // Dilate to close small gaps
    let grid2 = new Uint8Array(w * h);
    for(let y=1; y<h-1; y++){
        for(let x=1; x<w-1; x++){
            if (grid[y*w + x]) {
                grid2[y*w + x] = 1;
                grid2[(y-1)*w + x] = 1;
                grid2[(y+1)*w + x] = 1;
                grid2[y*w + x-1] = 1;
                grid2[y*w + x+1] = 1;
                grid2[(y-1)*w + x-1] = 1;
                grid2[(y+1)*w + x+1] = 1;
                grid2[(y-1)*w + x+1] = 1;
                grid2[(y+1)*w + x-1] = 1;
            }
        }
    }
    grid = grid2;

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

    // Output thresholded mask to json for inspection
    let pixels = [];
    for(let i=0; i<w*h; i++){
        if (grid[i]) pixels.push({x: i%w, y: Math.floor(i/w)});
    }
    fs.writeFileSync('public/debug_monaco.json', JSON.stringify({rawPixels: pixels, w, h}, null, 2));
    console.log("Wrote threshold mask to public/debug_monaco.json for inspection.");
}

extract().catch(console.error);
