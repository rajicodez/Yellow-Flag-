const fs = require('fs');

try {
  const updated = fs.readFileSync('src/data/updated_calendar_data.js', 'utf8');

  // 1. Update CALENDAR in racerTracks.js
  const calendarMatch = updated.match(/export const CALENDAR = \[([\s\S]*?)\];/);
  if (calendarMatch) {
    const newCalendar = `const CALENDAR = [${calendarMatch[1]}];`;
    let racerTracks = fs.readFileSync('src/data/racerTracks.js', 'utf8');
    racerTracks = racerTracks.replace(/const CALENDAR = \[[\s\S]*?\n\];/, newCalendar);
    fs.writeFileSync('src/data/racerTracks.js', racerTracks);
    console.log('Updated racerTracks.js');
  }

  // 2. Update f1Schedule2026 in schedule.js
  const scheduleMatch = updated.match(/export const f1Schedule2026 = \[([\s\S]*?)\];/);
  if (scheduleMatch) {
    const newSchedule = `export const f1Schedule2026 = [${scheduleMatch[1]}];`;
    let schedule = fs.readFileSync('src/data/schedule.js', 'utf8');
    schedule = schedule.replace(/export const f1Schedule2026 = \[[\s\S]*?\n\];/, newSchedule);
    fs.writeFileSync('src/data/schedule.js', schedule);
    console.log('Updated schedule.js');
  }

  // 3. Update f1Tracks2026 in tracks.js
  const tracksMatch = updated.match(/export const f1Tracks2026 = \[([\s\S]*?)\];/);
  if (tracksMatch) {
    const newTracks = `export const f1Tracks2026 = [${tracksMatch[1]}];`;
    let tracks = fs.readFileSync('src/data/tracks.js', 'utf8');
    tracks = tracks.replace(/export const f1Tracks2026 = \[[\s\S]*?\n\];/, newTracks);
    fs.writeFileSync('src/data/tracks.js', tracks);
    console.log('Updated tracks.js');
  }
} catch (e) {
  console.error(e);
}
