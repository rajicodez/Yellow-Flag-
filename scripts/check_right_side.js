import fs from 'fs';
import { Jimp } from 'jimp';

async function check() {
  const {w, h, mask} = JSON.parse(fs.readFileSync('monaco_mask_v2_clean.json', 'utf8'));
  
  // The right side complex is around X=1200 to 1357.
  // Let's create an image crop of that area.
  const cropW = 200;
  const cropH = 300;
  const startX = 1157; // 1357 - 200
  const startY = 200;
  
  const img = new Jimp({ width: cropW, height: cropH });
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      if (mask[(startY + y) * w + (startX + x)] === 1) {
        img.setPixelColor(0xFF0000FF, x, y);
      } else {
        img.setPixelColor(0xFFFFFFFF, x, y);
      }
    }
  }
  
  await img.write('monaco_right_side.png');
  console.log('Saved monaco_right_side.png');
}
check();
