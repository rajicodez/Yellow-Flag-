import { Jimp } from 'jimp';
import fs from 'fs';

async function extract() {
  const imgPath = 'C:/Users/ASUS/Downloads/images (14).png';
  const img = await Jimp.read(imgPath);
  const width = img.bitmap.width;
  const height = img.bitmap.height;

  // 1. Thresholding to find black pixels
  const isBlack = (r, g, b) => {
    return r < 75 && g < 75 && b < 75 && Math.max(r, g, b) - Math.min(r, g, b) < 35;
  };

  const road = new Array(height).fill(0).map(() => new Array(width).fill(false));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const r = img.bitmap.data[idx];
      const g = img.bitmap.data[idx + 1];
      const b = img.bitmap.data[idx + 2];
      if (isBlack(r, g, b)) {
        road[y][x] = true;
      }
    }
  }

  // 2. Distance Transform
  const dist = new Array(height).fill(0).map(() => new Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (road[y][x]) {
        let minDist = 1000;
        for (let dy = -10; dy <= 10; dy++) {
          for (let dx = -10; dx <= 10; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || ny >= height || nx < 0 || nx >= width || !road[ny][nx]) {
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < minDist) minDist = d;
            }
          }
        }
        dist[y][x] = minDist;
      }
    }
  }

  // 3. Local Maxima (Skeleton)
  const skeleton = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (dist[y][x] > 1) { // Only thick parts
        let isMax = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (dist[y + dy][x + dx] > dist[y][x]) {
              isMax = false;
            }
          }
        }
        if (isMax) {
          skeleton.push({ x, y, dist: dist[y][x] });
        }
      }
    }
  }

  console.log(`Found ${skeleton.length} skeleton points.`);
  fs.writeFileSync('skeleton.json', JSON.stringify(skeleton, null, 2));
}

extract().catch(console.error);
