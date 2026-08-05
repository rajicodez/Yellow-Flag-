import { Jimp } from 'jimp';

async function analyze() {
  const imgPath = 'C:/Users/ASUS/Downloads/images (14).png';
  const img = await Jimp.read(imgPath);
  const width = img.bitmap.width;
  const height = img.bitmap.height;

  let turquoise = 0;
  let black = 0;
  let white = 0;
  for (let idx = 0; idx < width * height * 4; idx += 4) {
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx + 1];
    const b = img.bitmap.data[idx + 2];
    
    if (r < 75 && g < 75 && b < 75 && Math.max(r,g,b)-Math.min(r,g,b) < 35) black++;
    else if (g > 100 && b > 100 && r < 100) turquoise++;
    else if (r > 200 && g > 200 && b > 200) white++;
  }
  console.log({ black, turquoise, white, total: width * height });
}
analyze().catch(console.error);
