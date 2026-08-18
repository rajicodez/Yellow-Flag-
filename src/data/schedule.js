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
  monaco: 'Monaco',
  barcelona: 'Spain',
  madrid: 'Spain',
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
  { round: 1, grandPrix: 'Australian GP', track: 'Albert Park Circuit', raceTime: '08 Mar, 09:30 AM', sprintDetails: null, trackSlug: 'australia' },
  { round: 2, grandPrix: 'Chinese GP', track: 'Shanghai International Circuit', raceTime: '15 Mar, 12:30 PM', sprintDetails: { sprintQualifying: '13 Mar', sprint: '14 Mar' }, trackSlug: 'china' },
  { round: 3, grandPrix: 'Japanese GP', track: 'Suzuka Circuit', raceTime: '29 Mar, 10:30 AM', sprintDetails: null, trackSlug: 'japan' },
  { round: 4, grandPrix: 'Bahrain GP', track: 'Bahrain International Circuit', raceTime: '12 Apr, 08:30 PM', sprintDetails: null, trackSlug: 'bahrain' },
  { round: 5, grandPrix: 'Saudi Arabian GP', track: 'Jeddah Corniche Circuit', raceTime: '19 Apr, 10:30 PM', sprintDetails: null, trackSlug: 'saudi-arabia' },
  { round: 6, grandPrix: 'Miami GP', track: 'Miami International Autodrome', raceTime: '04 May, 01:30 AM', sprintDetails: { sprintQualifying: '02 May', sprint: '03 May' }, trackSlug: 'miami' },
  { round: 7, grandPrix: 'Canadian GP', track: 'Circuit Gilles-Villeneuve', raceTime: '25 May, 01:30 AM', sprintDetails: { sprintQualifying: '23 May', sprint: '24 May' }, trackSlug: 'canada' },
  { round: 8, grandPrix: 'Monaco GP', track: 'Circuit de Monaco', raceTime: '07 Jun, 06:30 PM', sprintDetails: null, trackSlug: 'monaco' },
  { round: 9, grandPrix: 'Barcelona-Catalunya GP', track: 'Circuit de Barcelona-Catalunya', raceTime: '14 Jun, 06:30 PM', sprintDetails: null, trackSlug: 'barcelona' },
  { round: 10, grandPrix: 'Austrian GP', track: 'Red Bull Ring', raceTime: '28 Jun, 06:30 PM', sprintDetails: null, trackSlug: 'austria' },
  { round: 11, grandPrix: 'British GP', track: 'Silverstone Circuit', raceTime: '05 Jul, 07:30 PM', sprintDetails: { sprintQualifying: '03 Jul', sprint: '04 Jul' }, trackSlug: 'silverstone' },
  { round: 12, grandPrix: 'Belgian GP', track: 'Circuit de Spa-Francorchamps', raceTime: '19 Jul, 06:30 PM', sprintDetails: null, trackSlug: 'belgium' },
  { round: 13, grandPrix: 'Hungarian GP', track: 'Hungaroring', raceTime: '26 Jul, 06:30 PM', sprintDetails: null, trackSlug: 'hungary' },
  { round: 14, grandPrix: 'Dutch GP', track: 'Circuit Zandvoort', raceTime: '23 Aug, 06:30 PM', sprintDetails: { sprintQualifying: '21 Aug', sprint: '22 Aug' }, trackSlug: 'netherlands' },
  { round: 15, grandPrix: 'Italian GP', track: 'Autodromo Nazionale Monza', raceTime: '06 Sep, 06:30 PM', sprintDetails: null, trackSlug: 'monza' },
  { round: 16, grandPrix: 'Spanish GP', track: 'Madring', raceTime: '13 Sep, 06:30 PM', sprintDetails: null, trackSlug: 'madrid' },
  { round: 17, grandPrix: 'Azerbaijan GP', track: 'Baku City Circuit', raceTime: '26 Sep, 04:30 PM', sprintDetails: null, trackSlug: 'baku' },
  { round: 18, grandPrix: 'Singapore GP', track: 'Marina Bay Street Circuit', raceTime: '11 Oct, 05:30 PM', sprintDetails: { sprintQualifying: '09 Oct', sprint: '10 Oct' }, trackSlug: 'singapore' },
  { round: 19, grandPrix: 'United States GP', track: 'Circuit of The Americas', raceTime: '26 Oct, 01:30 AM', sprintDetails: null, trackSlug: 'austin' },
  { round: 20, grandPrix: 'Mexico City GP', track: 'Autodromo Hermanos Rodriguez', raceTime: '02 Nov, 01:30 AM', sprintDetails: null, trackSlug: 'mexico' },
  { round: 21, grandPrix: 'Sao Paulo GP', track: 'Autodromo Jose Carlos Pace', raceTime: '08 Nov, 10:30 PM', sprintDetails: null, trackSlug: 'brazil' },
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
