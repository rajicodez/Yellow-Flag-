import fs from 'fs';
import path from 'path';

function findFile(dir, target, depth) {
  if (depth > 4) return null;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const res = findFile(fullPath, target, depth + 1);
          if (res) return res;
        } else if (file === target) {
          return fullPath;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

const p1 = findFile('C:\\Users\\ASUS\\Downloads', 'Screenshot_2543.png', 0);
if (p1) { console.log('Found:', p1); process.exit(0); }

const p2 = findFile('C:\\Users\\ASUS\\Desktop', 'Screenshot_2543.png', 0);
if (p2) { console.log('Found:', p2); process.exit(0); }

const p3 = findFile('w:\\sinhala-f1-podcast', 'Screenshot_2543.png', 0);
if (p3) { console.log('Found:', p3); process.exit(0); }

console.log('Not found');
