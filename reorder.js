import fs from 'fs';

const orderIds = [
  'australia', 'china', 'japan', 'bahrain', 'saudi-arabia', 'miami', 'imola', 'monaco',
  'spain', 'canada', 'austria', 'silverstone', 'belgium', 'hungary', 'netherlands', 'monza',
  'baku', 'singapore', 'austin', 'mexico', 'brazil', 'las-vegas', 'qatar', 'abu-dhabi'
];

try {
  // 1. Update racerTracks.js
  let racer = fs.readFileSync('src/data/racerTracks.js', 'utf8');
  const calMatch = racer.match(/const CALENDAR = \[([\s\S]*?)\n\];/);
  if (calMatch) {
    const items = calMatch[1].split(/\n/).filter(line => line.trim().startsWith('{'));
    const map = {};
    items.forEach(item => {
      const m = item.match(/id:\s*'([^']+)'/);
      if (m) map[m[1]] = item;
    });
    const newCal = `const CALENDAR = [\n${orderIds.map(id => map[id]).join('\n')}\n];`;
    racer = racer.replace(/const CALENDAR = \[[\s\S]*?\n\];/, newCal);
    fs.writeFileSync('src/data/racerTracks.js', racer);
    console.log('racerTracks.js updated');
  }

  // 2. Update schedule.js
  let sched = fs.readFileSync('src/data/schedule.js', 'utf8');
  const schedMatch = sched.match(/export const f1Schedule2026 = \[([\s\S]*?)\n\];/);
  if (schedMatch) {
    const items = schedMatch[1].split(/\n/).filter(line => line.trim().startsWith('{'));
    const map = {};
    items.forEach(item => {
      const m = item.match(/trackSlug:\s*'([^']+)'/);
      if (m) {
        map[m[1]] = item;
      } else if (item.includes('Qatar')) {
        map['qatar'] = item; 
      }
    });
    
    const orderedSched = orderIds.map((id, idx) => {
      let item = map[id];
      if(!item) throw new Error("Missing schedule for: " + id);
      return item.replace(/round:\s*\d+/, `round: ${idx + 1}`);
    });
    const newSched = `export const f1Schedule2026 = [\n${orderedSched.join('\n')}\n];`;
    sched = sched.replace(/export const f1Schedule2026 = \[[\s\S]*?\n\];/, newSched);
    fs.writeFileSync('src/data/schedule.js', sched);
    console.log('schedule.js updated');
  }

  // 3. Update tracks.js
  let tracks = fs.readFileSync('src/data/tracks.js', 'utf8');
  const tracksMatch = tracks.match(/export const f1Tracks2026 = \[([\s\S]*?)\n\];/);
  if (tracksMatch) {
    const block = tracksMatch[1];
    const itemBlocks = block.split(/  \},/);
    const map = {};
    
    itemBlocks.forEach(itemStr => {
      if (!itemStr.trim()) return;
      let fullItem = itemStr;
      if (!fullItem.endsWith('}')) fullItem += '  }'; 
      
      let slug = '';
      if (fullItem.includes('bahrain')) slug = 'bahrain';
      else if (fullItem.includes('jeddah')) slug = 'saudi-arabia';
      else if (fullItem.includes('Albert Park')) slug = 'australia';
      else if (fullItem.includes('suzuka')) slug = 'japan';
      else if (fullItem.includes('shanghai')) slug = 'china';
      else if (fullItem.includes('miami')) slug = 'miami';
      else if (fullItem.includes('imola')) slug = 'imola';
      else if (fullItem.includes('monaco')) slug = 'monaco';
      else if (fullItem.includes('montreal')) slug = 'canada';
      else if (fullItem.includes('Madring') || fullItem.includes('IFEMA')) slug = 'spain';
      else if (fullItem.includes('spielberg')) slug = 'austria';
      else if (fullItem.includes('silverstone')) slug = 'silverstone';
      else if (fullItem.includes('hungaroring')) slug = 'hungary';
      else if (fullItem.includes('spa-francorchamps')) slug = 'belgium';
      else if (fullItem.includes('zandvoort')) slug = 'netherlands';
      else if (fullItem.includes('monza')) slug = 'monza';
      else if (fullItem.includes('baku')) slug = 'baku';
      else if (fullItem.includes('marina-bay')) slug = 'singapore';
      else if (fullItem.includes('austin')) slug = 'austin';
      else if (fullItem.includes('mexico')) slug = 'mexico';
      else if (fullItem.includes('interlagos')) slug = 'brazil';
      else if (fullItem.includes('las-vegas')) slug = 'las-vegas';
      else if (fullItem.includes('lusail')) slug = 'qatar';
      else if (fullItem.includes('yas-marina')) slug = 'abu-dhabi';

      if (slug) map[slug] = fullItem;
    });

    const orderedTracks = orderIds.map((id, idx) => {
      let item = map[id];
      if(!item) throw new Error("Missing tracks.js mapping for: " + id);
      return item.replace(/id:\s*\d+/, `id: ${idx + 1}`);
    });
    
    // Reconstruct with proper commas
    const newTracks = `export const f1Tracks2026 = [\n${orderedTracks.join(',\n')}\n];`;
    tracks = tracks.replace(/export const f1Tracks2026 = \[[\s\S]*?\n\];/, newTracks);
    fs.writeFileSync('src/data/tracks.js', tracks);
    console.log('tracks.js updated');
  }
} catch (e) {
  console.error(e);
}
