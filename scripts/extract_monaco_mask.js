import { Jimp } from 'jimp';
import fs from 'fs';

async function extract() {
  const imgPath = 'C:/Users/ASUS/Downloads/Monte-Carlo04.png';
  const img = await Jimp.read(imgPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  const mask = new Array(w * h).fill(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hex = img.getPixelColor(x, y);
      const r = (hex >> 24) & 255;
      const g = (hex >> 16) & 255;
      const b = (hex >> 8) & 255;

      if (r > 170 && r > g * 1.25 && r > b * 1.15 && g < 190 && b < 190) {
        mask[y * w + x] = 1;
      }
    }
  }

  // Connected components
  const labels = new Array(w * h).fill(0);
  let currentLabel = 1;
  const compSize = [0]; // 0 is background

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1 && labels[y * w + x] === 0) {
        // BFS
        let size = 0;
        const q = [{x, y}];
        labels[y * w + x] = currentLabel;
        let head = 0;
        while (head < q.length) {
          const p = q[head++];
          size++;
          const neighbors = [
            {x: p.x + 1, y: p.y}, {x: p.x - 1, y: p.y},
            {x: p.x, y: p.y + 1}, {x: p.x, y: p.y - 1},
            {x: p.x + 1, y: p.y + 1}, {x: p.x - 1, y: p.y - 1},
            {x: p.x + 1, y: p.y - 1}, {x: p.x - 1, y: p.y + 1}
          ];
          for (const n of neighbors) {
            if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
              const idx = n.y * w + n.x;
              if (mask[idx] === 1 && labels[idx] === 0) {
                labels[idx] = currentLabel;
                q.push(n);
              }
            }
          }
        }
        compSize.push(size);
        currentLabel++;
      }
    }
  }

  let maxLabel = 0;
  let maxSize = 0;
  for (let i = 1; i < compSize.length; i++) {
    if (compSize[i] > maxSize) {
      maxSize = compSize[i];
      maxLabel = i;
    }
  }

  console.log(`Largest component ${maxLabel} size: ${maxSize}`);

  let minX = w, maxX = 0, minY = h, maxY = 0;
  // Keep only largest component
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (labels[y * w + x] === maxLabel) {
        mask[y * w + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        mask[y * w + x] = 0;
      }
    }
  }

  console.log(`Bounds: X=${minX}-${maxX}, Y=${minY}-${maxY}`);

  // Save cleaned mask
  const debugImg = new Jimp({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        debugImg.setPixelColor(0xFFFFFFFF, x, y);
      } else {
        debugImg.setPixelColor(0x000000FF, x, y);
      }
    }
  }
  await debugImg.write('monaco_mask_clean.png');

  fs.writeFileSync('monaco_mask_clean.json', JSON.stringify({w, h, mask}));
}

extract().catch(console.error);
