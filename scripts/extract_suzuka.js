import { Jimp } from 'jimp';
import fs from 'fs';

async function extract() {
  const imgPath = 'C:/Users/ASUS/Downloads/SuzukaGP2004.png';
  const img = await Jimp.read(imgPath);
  const width = img.bitmap.width;
  const height = img.bitmap.height;

  // 1. Threshold for red
  const redMask = new Array(height).fill(0).map(() => new Array(width).fill(false));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      const r = img.bitmap.data[idx];
      const g = img.bitmap.data[idx + 1];
      const b = img.bitmap.data[idx + 2];
      
      if (r > 170 && r > g * 1.6 && r > b * 1.6 && g < 140 && b < 140) {
        redMask[y][x] = true;
      }
    }
  }

  // 2. Connected Components
  const visited = new Array(height).fill(0).map(() => new Array(width).fill(false));
  const components = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (redMask[y][x] && !visited[y][x]) {
        const comp = [];
        const q = [{x, y}];
        visited[y][x] = true;
        let head = 0;
        
        while (head < q.length) {
          const p = q[head++];
          comp.push(p);
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = p.y + dy, nx = p.x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width && redMask[ny][nx] && !visited[ny][nx]) {
                visited[ny][nx] = true;
                q.push({x: nx, y: ny});
              }
            }
          }
        }
        if (comp.length > 50) {
          components.push(comp);
        }
      }
    }
  }

  // Keep top 3 largest components
  components.sort((a, b) => b.length - a.length);
  const mainComps = components.slice(0, 3);
  console.log(`Found ${mainComps.length} main components. Sizes: ${mainComps.map(c => c.length).join(', ')}`);

  // 3. Distance transform for skeletonization
  const skeletonPts = [];
  for (let cIdx = 0; cIdx < mainComps.length; cIdx++) {
    const comp = mainComps[cIdx];
    const compGrid = new Array(height).fill(0).map(() => new Array(width).fill(false));
    const distGrid = new Array(height).fill(0).map(() => new Array(width).fill(0));
    
    for (const p of comp) compGrid[p.y][p.x] = true;
    
    for (const p of comp) {
      let minDist = 1000;
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const ny = p.y + dy, nx = p.x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width || !compGrid[ny][nx]) {
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minDist) minDist = d;
          }
        }
      }
      distGrid[p.y][p.x] = minDist;
    }
    
    // Find local maxima
    const skel = [];
    for (const p of comp) {
      if (distGrid[p.y][p.x] > 0.5) { // thick enough
        let isMax = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx===0 && dy===0) continue;
            const ny = p.y+dy, nx = p.x+dx;
            if (ny>=0 && ny<height && nx>=0 && nx<width && compGrid[ny][nx]) {
              if (distGrid[ny][nx] > distGrid[p.y][p.x]) isMax = false;
            }
          }
        }
        if (isMax) {
          skel.push(p);
          skeletonPts.push({...p, comp: cIdx});
        }
      }
    }
  }

  fs.writeFileSync('suzuka_skeleton.json', JSON.stringify(skeletonPts));
  console.log(`Extracted ${skeletonPts.length} skeleton points.`);
}

extract().catch(console.error);
