const { Jimp } = require('jimp');
const fs = require('fs');

async function debug() {
    const img = await Jimp.read('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\9bb1130f-7ad5-492c-886e-cf974941e27c\\.user_uploaded\\media__1785037408546.png');
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    let out = "P1\n" + w + " " + h + "\n";
    for(let y=0; y<h; y++){
        for(let x=0; x<w; x++){
            const idx = (y*w + x) * 4;
            const r = img.bitmap.data[idx];
            const g = img.bitmap.data[idx+1];
            const b = img.bitmap.data[idx+2];
            if (r < 100 && g < 100 && b < 100) {
                out += "1 ";
            } else {
                out += "0 ";
            }
        }
        out += "\n";
    }
    fs.writeFileSync('public/debug.pbm', out);
    console.log("Wrote public/debug.pbm");
}
debug().catch(console.error);
