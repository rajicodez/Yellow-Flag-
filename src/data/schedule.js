export const scheduleIntro =
  'Follow the 2026 Formula 1 season with Yellow Flag. Check every Grand Prix weekend, Sri Lanka race time, track, and sprint details in one place.';

export const activeF1Season = 2026;

const countryByTrackSlug = {
  australia: 'Australia',
  china: 'China',
  japan: 'Japan',
  bahrain: 'Bahrain',
  'saudi-arabia': 'Saudi Arabia',
  miami: 'United States',
  imola: 'Italy',
  monaco: 'Monaco',
  spain: 'Spain',
  canada: 'Canada',
  austria: 'Austria',
  silverstone: 'United Kingdom',
  belgium: 'Belgium',
  hungary: 'Hungary',
  netherlands: 'Netherlands',
  monza: 'Italy',
  baku: 'Azerbaijan',
  singapore: 'Singapore',
  austin: 'United States',
  mexico: 'Mexico',
  brazil: 'Brazil',
  'las-vegas': 'United States',
  qatar: 'Qatar',
  'abu-dhabi': 'United Arab Emirates',
};

const monthNumbers = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function toSriLankaIso(raceTime) {
  const match = raceTime.match(/^(\d{2}) (\w{3}), (\d{2}):(\d{2}) (AM|PM)$/);
  if (!match) return '';

  const [, day, month, hourText, minute, meridiem] = match;
  let hour = Number(hourText) % 12;
  if (meridiem === 'PM') hour += 12;

  return `${activeF1Season}-${monthNumbers[month]}-${day}T${String(hour).padStart(2, '0')}:${minute}:00+05:30`;
}

const raceSchedule2026 = [
  { round: 1, grandPrix: 'Australian GP', track: 'Albert Park Circuit', raceTime: '15 Mar, 09:30 AM', sprintDetails: null, trackSlug: 'australia' },
  { round: 2, grandPrix: 'Chinese GP', track: 'Shanghai International Circuit', raceTime: '12 Apr, 12:30 PM', sprintDetails: { sprintQualifying: '10 Apr, 01:00-01:44 PM', sprint: '11 Apr, 08:30-09:30 AM' }, trackSlug: 'china' },
  { round: 3, grandPrix: 'Japanese GP', track: 'Suzuka Circuit', raceTime: '29 Mar, 10:30 AM', sprintDetails: null, trackSlug: 'japan' },
  { round: 4, grandPrix: 'Bahrain GP', track: 'Bahrain International Circuit', raceTime: '28 Feb, 06:00 PM', sprintDetails: null, trackSlug: 'bahrain' },
  { round: 5, grandPrix: 'Saudi Arabian GP', track: 'Jeddah Corniche Circuit', raceTime: '07 Mar, 08:00 PM', sprintDetails: null, trackSlug: 'saudi-arabia' },
  { round: 6, grandPrix: 'Miami GP', track: 'Miami International Autodrome', raceTime: '03 May, 10:30 PM', sprintDetails: { sprintQualifying: '02 May, 02:00-02:44 AM', sprint: '02 May, 09:30-10:30 PM' }, trackSlug: 'miami' },
  { round: 7, grandPrix: 'Emilia Romagna GP', track: 'Autodromo Enzo e Dino Ferrari', raceTime: '17 May, 06:30 PM', sprintDetails: null, trackSlug: 'imola' },
  { round: 8, grandPrix: 'Monaco GP', track: 'Circuit de Monaco', raceTime: '24 May, 06:30 PM', sprintDetails: null, trackSlug: 'monaco' },
  { round: 9, grandPrix: 'Spanish GP', track: 'IFEMA Madrid', raceTime: '21 Jun, 06:30 PM', sprintDetails: null, trackSlug: 'spain' },
  { round: 10, grandPrix: 'Canadian GP', track: 'Circuit Gilles-Villeneuve', raceTime: '07 Jun, 01:30 AM', sprintDetails: null, trackSlug: 'canada' },
  { round: 11, grandPrix: 'Austrian GP', track: 'Red Bull Ring', raceTime: '28 Jun, 06:30 PM', sprintDetails: { sprintQualifying: '27 Jun, 02:00-02:44 PM', sprint: '28 Jun, 10:30-11:30 AM' }, trackSlug: 'austria' },
  { round: 12, grandPrix: 'British GP', track: 'Silverstone Circuit', raceTime: '05 Jul, 07:30 PM', sprintDetails: null, trackSlug: 'silverstone' },
  { round: 13, grandPrix: 'Belgian GP', track: 'Circuit de Spa-Francorchamps', raceTime: '19 Jul, 06:30 PM', sprintDetails: null, trackSlug: 'belgium' },
  { round: 14, grandPrix: 'Hungarian GP', track: 'Hungaroring', raceTime: '26 Jul, 06:30 PM', sprintDetails: null, trackSlug: 'hungary' },
  { round: 15, grandPrix: 'Dutch GP', track: 'Circuit Zandvoort', raceTime: '23 Aug, 06:30 PM', sprintDetails: null, trackSlug: 'netherlands' },
  { round: 16, grandPrix: 'Italian GP', track: 'Autodromo Nazionale Monza', raceTime: '30 Aug, 06:30 PM', sprintDetails: null, trackSlug: 'monza' },
  { round: 17, grandPrix: 'Azerbaijan GP', track: 'Baku City Circuit', raceTime: '13 Sep, 04:30 PM', sprintDetails: null, trackSlug: 'baku' },
  { round: 18, grandPrix: 'Singapore GP', track: 'Marina Bay Street Circuit', raceTime: '27 Sep, 05:30 PM', sprintDetails: null, trackSlug: 'singapore' },
  { round: 19, grandPrix: 'United States GP', track: 'Circuit of The Americas', raceTime: '18 Oct, 01:30 AM', sprintDetails: { sprintQualifying: '17 Oct, 03:00-03:44 AM', sprint: '17 Oct, 11:30 PM-12:30 AM' }, trackSlug: 'austin' },
  { round: 20, grandPrix: 'Mexico City GP', track: 'Autodromo Hermanos Rodriguez', raceTime: '25 Oct, 01:30 AM', sprintDetails: null, trackSlug: 'mexico' },
  { round: 21, grandPrix: 'Sao Paulo GP', track: 'Autodromo Jose Carlos Pace', raceTime: '01 Nov, 10:30 PM', sprintDetails: { sprintQualifying: '31 Oct, 07:00-07:44 PM', sprint: '01 Nov, 03:30-04:30 PM' }, trackSlug: 'brazil' },
  { round: 22, grandPrix: 'Las Vegas GP', track: 'Las Vegas Strip Circuit', raceTime: '22 Nov, 11:30 AM', sprintDetails: null, trackSlug: 'las-vegas' },
  { round: 23, grandPrix: 'Qatar GP', track: 'Lusail International Circuit', raceTime: '29 Nov, 09:30 PM', sprintDetails: { sprintQualifying: '28 Nov, 06:30-07:14 PM', sprint: '29 Nov, 02:30-03:30 PM' }, trackSlug: 'qatar' },
  { round: 24, grandPrix: 'Abu Dhabi GP', track: 'Yas Marina Circuit', raceTime: '06 Dec, 06:30 PM', sprintDetails: null, trackSlug: 'abu-dhabi' }
];

export const f1Schedule2026 = raceSchedule2026.map((race) => ({
  ...race,
  id: `${activeF1Season}-${race.trackSlug}`,
  season: activeF1Season,
  name: race.grandPrix.replace(/ GP$/, ' Grand Prix'),
  circuit: race.track,
  country: countryByTrackSlug[race.trackSlug],
  raceStart: toSriLankaIso(race.raceTime),
  sprintWeekend: Boolean(race.sprintDetails),
}));
