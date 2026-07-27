import('./src/data/racerTracks.js').then(racerTracks => {
  const mex = racerTracks.TRACKS.find(t => t.id === 'mexico');
  try {
    const geom = racerTracks.getTrackGeometry(mex);
    console.log('Geometry generated successfully');
  } catch (e) {
    console.error('Error caught:', e.message);
  }
}).catch(err => {
  console.error('Import error', err);
});
