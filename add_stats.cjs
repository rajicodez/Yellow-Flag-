const fs = require('fs');

const stats = {
  1: { corners: 15, lapRecord: '1:31.447 (Pedro de la Rosa, 2005)' },
  2: { corners: 27, lapRecord: '1:30.734 (Lewis Hamilton, 2021)' },
  3: { corners: 14, lapRecord: '1:19.813 (Charles Leclerc, 2024)' },
  4: { corners: 18, lapRecord: '1:30.983 (Lewis Hamilton, 2019)' },
  5: { corners: 16, lapRecord: '1:32.238 (Michael Schumacher, 2004)' },
  6: { corners: 19, lapRecord: '1:29.708 (Max Verstappen, 2023)' },
  7: { corners: 19, lapRecord: '1:15.484 (Lewis Hamilton, 2020)' },
  8: { corners: 19, lapRecord: '1:12.909 (Lewis Hamilton, 2021)' },
  9: { corners: 14, lapRecord: '1:13.078 (Valtteri Bottas, 2019)' },
  10: { corners: 22, lapRecord: 'N/A (New Circuit)' },
  11: { corners: 10, lapRecord: '1:05.619 (Carlos Sainz, 2020)' },
  12: { corners: 18, lapRecord: '1:27.097 (Max Verstappen, 2020)' },
  13: { corners: 14, lapRecord: '1:16.627 (Lewis Hamilton, 2020)' },
  14: { corners: 19, lapRecord: '1:46.286 (Valtteri Bottas, 2018)' },
  15: { corners: 14, lapRecord: '1:11.097 (Lewis Hamilton, 2021)' },
  16: { corners: 11, lapRecord: '1:21.046 (Rubens Barrichello, 2004)' },
  17: { corners: 20, lapRecord: '1:43.009 (Charles Leclerc, 2019)' },
  18: { corners: 19, lapRecord: '1:35.867 (Lewis Hamilton, 2023)' },
  19: { corners: 20, lapRecord: '1:36.169 (Charles Leclerc, 2019)' },
  20: { corners: 17, lapRecord: '1:17.774 (Valtteri Bottas, 2021)' },
  21: { corners: 15, lapRecord: '1:10.540 (Valtteri Bottas, 2018)' },
  22: { corners: 17, lapRecord: '1:35.490 (Oscar Piastri, 2023)' },
  23: { corners: 16, lapRecord: '1:24.319 (Max Verstappen, 2023)' },
  24: { corners: 16, lapRecord: '1:26.103 (Max Verstappen, 2021)' }
};

let content = fs.readFileSync('src/data/tracks.js', 'utf8');

for (const [id, data] of Object.entries(stats)) {
  const regex = new RegExp(`(id:\\s*${id},\\s*[\\s\\S]*?)(description:)`);
  content = content.replace(regex, `$1corners: ${data.corners},\n    lapRecord: '${data.lapRecord}',\n    $2`);
}

fs.writeFileSync('src/data/tracks.js', content);
console.log('Done modifying tracks.js');
