import { Jimp } from 'jimp';

async function checkColors() {
  const imgPath = 'C:/Users/ASUS/Downloads/Circuit-Map-Monaco-F1-_1_-Tile (1).jpg';
  const img = await Jimp.read(imgPath);
  
  const colors = new Map();
  for (let y = 230; y <= 280; y++) {
    for (let x = 1150; x < 1350; x++) {
      const hex = img.getPixelColor(x, y);
      const r = (hex >> 24) & 255;
      const g = (hex >> 16) & 255;
      const b = (hex >> 8) & 255;
      
      const key = `${r},${g},${b}`;
      colors.set(key, (colors.get(key) || 0) + 1);
    }
  }
  
  const sorted = Array.from(colors.entries()).sort((a, b) => b[1] - a[1]);
  console.log('Top colors in the Y=230-280 gap zone:');
  for (let i = 0; i < 20 && i < sorted.length; i++) {
    console.log(`${sorted[i][0]} : ${sorted[i][1]} pixels`);
  }
}
checkColors();
