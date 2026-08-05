import { TRACKS, getTrackGeometry } from './src/data/racerTracks.js';
const mex = TRACKS.find(t => t.id === 'mexico');
try {
  console.log("Testing Mexico track initialization...");
  const geom = getTrackGeometry(mex);
  console.log("Success! Points length:", geom.pts.length);
} catch (e) {
  console.error("Initialization failed:", e);
  process.exit(1);
}
