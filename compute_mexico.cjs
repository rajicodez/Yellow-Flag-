global.import = {
  meta: {
    glob: (pattern) => {
      // Return a mapping of SVG file paths used by racerTracks
      return { '../assets/tracks/mexico.svg': 'src/assets/tracks/mexico.svg' };
    }
  }
};

import('./src/data/racerTracks.js').then(racerTracks => {
  const mex = racerTracks.TRACKS.find(t => t.id === 'mexico');
  try {
    const geom = racerTracks.getTrackGeometry(mex);
    console.log('Geometry generated. minCanvasDist =', geom.minCanvasDist);
  } catch (e) {
    console.error('Error:', e.message);
  }
}).catch(err => {
  console.error('Import failed:', err);
});
