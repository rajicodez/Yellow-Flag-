import fs from 'fs';
import { Jimp } from 'jimp';

const {w, h, mask} = JSON.parse(fs.readFileSync('monaco_mask_clean.json', 'utf8'));

// Distance transform
const dist = new Array(w * h).fill(0);
for (let i = 0; i < w * h; i++) {
  if (mask[i] === 1) dist[i] = Infinity;
}

// Forward pass
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const idx = y * w + x;
    if (dist[idx] > 0) {
      dist[idx] = Math.min(
        dist[idx],
        dist[idx - 1] + 1,
        dist[idx - w - 1] + Math.SQRT2,
        dist[idx - w] + 1,
        dist[idx - w + 1] + Math.SQRT2
      );
    }
  }
}

// Backward pass
for (let y = h - 2; y >= 1; y--) {
  for (let x = w - 2; x >= 1; x--) {
    const idx = y * w + x;
    if (dist[idx] > 0) {
      dist[idx] = Math.min(
        dist[idx],
        dist[idx + 1] + 1,
        dist[idx + w - 1] + Math.SQRT2,
        dist[idx + w] + 1,
        dist[idx + w + 1] + Math.SQRT2
      );
    }
  }
}

// Skeleton via local maxima of distance transform
const skeleton = new Array(w * h).fill(0);
const skeletonPts = [];
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const idx = y * w + x;
    if (dist[idx] > 1.5) { // Needs some thickness
      const d = dist[idx];
      let isMax = true;
      const neighbors = [
        dist[idx + 1], dist[idx - 1],
        dist[idx + w], dist[idx - w],
        dist[idx + w + 1], dist[idx + w - 1],
        dist[idx - w + 1], dist[idx - w - 1]
      ];
      let largerCount = 0;
      for (const n of neighbors) {
        if (n > d) largerCount++;
      }
      if (largerCount <= 1) { // Allow slight ridges
        skeleton[idx] = 1;
        skeletonPts.push({x, y});
      }
    }
  }
}

console.log(`Generated ${skeletonPts.length} skeleton points`);
fs.writeFileSync('monaco_skeleton.json', JSON.stringify(skeletonPts));

// Let's also create an image of the skeleton to debug
async function saveSkeleton() {
  const img = new Jimp({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skeleton[y * w + x] === 1) {
        img.setPixelColor(0xFF0000FF, x, y);
      } else if (mask[y * w + x] === 1) {
        img.setPixelColor(0x333333FF, x, y);
      } else {
        img.setPixelColor(0x000000FF, x, y);
      }
    }
  }
  await img.write('monaco_skeleton_debug.png');
  console.log('Saved monaco_skeleton_debug.png');
}
saveSkeleton().catch(console.error);
