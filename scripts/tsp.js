import fs from 'fs';

const pts = JSON.parse(fs.readFileSync('skeleton.json', 'utf8'));
const N = pts.length;

// Greedy TSP
let visited = new Array(N).fill(false);
let tour = [];
let curr = 0;
tour.push(curr);
visited[curr] = true;

for (let i = 1; i < N; i++) {
  let next = -1;
  let minDist = Infinity;
  for (let j = 0; j < N; j++) {
    if (!visited[j]) {
      let d = Math.hypot(pts[curr].x - pts[j].x, pts[curr].y - pts[j].y);
      if (d < minDist) {
        minDist = d;
        next = j;
      }
    }
  }
  tour.push(next);
  visited[next] = true;
  curr = next;
}

// 2-opt
let improved = true;
while (improved) {
  improved = false;
  for (let i = 1; i < N - 2; i++) {
    for (let j = i + 1; j < N - 1; j++) {
      let d1 = Math.hypot(pts[tour[i-1]].x - pts[tour[i]].x, pts[tour[i-1]].y - pts[tour[i]].y) + 
               Math.hypot(pts[tour[j]].x - pts[tour[j+1]].x, pts[tour[j]].y - pts[tour[j+1]].y);
      let d2 = Math.hypot(pts[tour[i-1]].x - pts[tour[j]].x, pts[tour[i-1]].y - pts[tour[j]].y) + 
               Math.hypot(pts[tour[i]].x - pts[tour[j+1]].x, pts[tour[i]].y - pts[tour[j+1]].y);
      if (d2 < d1) {
        // Reverse tour[i...j]
        let temp = tour.slice(i, j + 1).reverse();
        for (let k = i; k <= j; k++) {
          tour[k] = temp[k - i];
        }
        improved = true;
      }
    }
  }
}

let svgPath = `M ${pts[tour[0]].x} ${pts[tour[0]].y} `;
for (let i = 1; i < N; i++) {
  svgPath += `L ${pts[tour[i]].x} ${pts[tour[i]].y} `;
}
svgPath += 'Z';

console.log("Total distance:", tour.reduce((acc, curr, i) => acc + Math.hypot(pts[curr].x - pts[tour[(i+1)%N]].x, pts[curr].y - pts[tour[(i+1)%N]].y), 0));
fs.writeFileSync('mexico.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 503 397"><path d="${svgPath}" stroke="cyan" fill="none" stroke-width="2"/></svg>`);
console.log('Saved to mexico.svg');
