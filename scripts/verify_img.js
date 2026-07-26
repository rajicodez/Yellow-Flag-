import { Jimp } from 'jimp';

async function verify() {
  const imgPath = 'C:/Users/ASUS/Downloads/images (15).png';
  const img = await Jimp.read(imgPath);
  console.log(`Dimensions: ${img.bitmap.width}x${img.bitmap.height}`);
}
verify().catch(console.error);
