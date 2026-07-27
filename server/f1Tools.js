import { Type } from '@google/genai';

// Same API the site already uses in Standing.jsx (Jolpica — the Ergast successor).
const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

async function fetchJolpica(path) {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.data;

  const res = await fetch(`${JOLPICA_BASE}/${path}`, {
    headers: { 'User-Agent': 'YellowFlag-F1-Assistant/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Jolpica API request failed (${res.status}) for ${path}`);
  }
  const data = await res.json();
  cache.set(path, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

function assertSeason(season = 'current') {
  const value = String(season).toLowerCase();
  if (!/^(current|\d{4})$/.test(value)) throw new Error(`Invalid season "${season}"`);
  return value;
}

function assertRound(round = 'last') {
  const value = String(round).toLowerCase();
  if (!/^(last|next|\d{1,2})$/.test(value)) throw new Error(`Invalid round "${round}"`);
  return value;
}

async function getDriverStandings({ season } = {}) {
  const s = assertSeason(season);
  const data = await fetchJolpica(`${s}/driverStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) return { error: `No driver standings found for season "${s}".` };
  return {
    season: list.season,
    afterRound: list.round,
    standings: (list.DriverStandings ?? []).map((d) => ({
      position: d.position,
      driver: `${d.Driver.givenName} ${d.Driver.familyName}`,
      nationality: d.Driver.nationality,
      team: d.Constructors?.[0]?.name ?? 'Unknown',
      points: d.points,
      wins: d.wins,
    })),
  };
}

async function getConstructorStandings({ season } = {}) {
  const s = assertSeason(season);
  const data = await fetchJolpica(`${s}/constructorStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) return { error: `No constructor standings found for season "${s}".` };
  return {
    season: list.season,
    afterRound: list.round,
    standings: (list.ConstructorStandings ?? []).map((c) => ({
      position: c.position,
      team: c.Constructor.name,
      nationality: c.Constructor.nationality,
      points: c.points,
      wins: c.wins,
    })),
  };
}

function mapRace(race) {
  return {
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit?.circuitName,
    location: [race.Circuit?.Location?.locality, race.Circuit?.Location?.country]
      .filter(Boolean)
      .join(', '),
    date: race.date,
    timeUTC: race.time ?? null,
    hasSprint: Boolean(race.Sprint),
  };
}

async function getRaceSchedule({ season } = {}) {
  const s = assertSeason(season);
  const data = await fetchJolpica(`${s}.json`);
  const races = data?.MRData?.RaceTable?.Races ?? [];
  if (!races.length) return { error: `No schedule found for season "${s}".` };
  return {
    season: data.MRData.RaceTable.season,
    totalRaces: races.length,
    races: races.map(mapRace),
  };
}

async function getNextRace() {
  const schedule = await getRaceSchedule({ season: 'current' });
  if (schedule.error) return schedule;
  const now = new Date();
  const next = schedule.races.find((race) => {
    const start = new Date(`${race.date}T${race.timeUTC ?? '00:00:00Z'}`);
    return start.getTime() > now.getTime() - 3 * 60 * 60 * 1000; // still "next" while race is live
  });
  if (!next) return { info: `The ${schedule.season} season has finished.`, lastRace: schedule.races.at(-1) };
  return { season: schedule.season, nextRace: next, nowUTC: now.toISOString() };
}

// "Monaco", "the Monaco GP", "Silverstone", "Japan" -> a round number, so the model
// never has to remember which round a Grand Prix was.
async function resolveRound(season, raceName) {
  const schedule = await getRaceSchedule({ season });
  if (schedule.error) return schedule;

  const q = String(raceName)
    .toLowerCase()
    .replace(/\b(grand prix|gp|grandprix)\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
  if (!q) return { error: 'Empty race name.' };

  const haystack = (race) =>
    [race.raceName, race.circuit, race.location].filter(Boolean).join(' ').toLowerCase();
  const match =
    schedule.races.find((race) => haystack(race).includes(q)) ??
    schedule.races.find((race) => q.split(/\s+/).some((w) => w.length > 3 && haystack(race).includes(w)));

  if (!match) {
    return {
      error: `No race matching "${raceName}" in the ${schedule.season} season.`,
      availableRaces: schedule.races.map((race) => `${race.round}: ${race.raceName}`),
    };
  }
  return { round: match.round };
}

async function getRaceResults({ season, round, raceName } = {}) {
  const s = assertSeason(season);

  if (!round && raceName) {
    const resolved = await resolveRound(s, raceName);
    if (resolved.error) return resolved;
    round = resolved.round;
  }

  const r = assertRound(round);
  const data = await fetchJolpica(`${s}/${r}/results.json`);
  const race = data?.MRData?.RaceTable?.Races?.[0];
  if (!race) return { error: `No results found for season "${s}", round "${r}". The race may not have happened yet.` };
  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit?.circuitName,
    date: race.date,
    results: (race.Results ?? []).map((res) => ({
      position: res.position,
      driver: `${res.Driver.givenName} ${res.Driver.familyName}`,
      team: res.Constructor?.name,
      grid: res.grid,
      points: res.points,
      timeOrStatus: res.Time?.time ?? res.status,
    })),
  };
}

export const functionDeclarations = [
  {
    name: 'get_driver_standings',
    description:
      'Get the Formula 1 drivers championship standings for a season (1950 to current). Position 1 of a finished season is the World Champion.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        season: {
          type: Type.STRING,
          description: 'A 4-digit year like "2007", or "current" for the ongoing season. Default: "current".',
        },
      },
    },
  },
  {
    name: 'get_constructor_standings',
    description:
      'Get the Formula 1 constructors (teams) championship standings for a season (1958 to current). Position 1 of a finished season is the Constructors Champion.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        season: {
          type: Type.STRING,
          description: 'A 4-digit year like "2007", or "current" for the ongoing season. Default: "current".',
        },
      },
    },
  },
  {
    name: 'get_race_schedule',
    description:
      'Get the full race calendar for a Formula 1 season: every Grand Prix with round number, circuit, location, date, UTC start time, and whether it has a sprint.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        season: {
          type: Type.STRING,
          description: 'A 4-digit year like "2026", or "current". Default: "current".',
        },
      },
    },
  },
  {
    name: 'get_next_race',
    description:
      'Get the next upcoming Grand Prix in the current season, with its date and UTC start time. Use for "when is the next race" questions.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_race_results',
    description:
      'Get the classified results of a specific Grand Prix — finishing order, teams, grid positions, points, and race time or retirement status. This is the ONLY way to know who won a race; never answer a "who won" question without calling it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        season: {
          type: Type.STRING,
          description: 'A 4-digit year like "2021", or "current". Default: "current".',
        },
        raceName: {
          type: Type.STRING,
          description:
            'The Grand Prix by name, circuit, or place — "Monaco", "Silverstone", "Japanese Grand Prix". Use this when you do not know the round number; it is resolved against that season\'s calendar.',
        },
        round: {
          type: Type.STRING,
          description:
            'Round number like "14", or "last" for the most recent race. Only use when the round is actually known; otherwise pass raceName. Defaults to "last" when neither is given.',
        },
      },
    },
  },
];

const executors = {
  get_driver_standings: getDriverStandings,
  get_constructor_standings: getConstructorStandings,
  get_race_schedule: getRaceSchedule,
  get_next_race: getNextRace,
  get_race_results: getRaceResults,
};

export async function executeTool(name, args) {
  const executor = executors[name];
  if (!executor) return { error: `Unknown tool "${name}"` };
  try {
    return await executor(args ?? {});
  } catch (err) {
    console.error(`[tool:${name}]`, err.message);
    return { error: `Tool failed: ${err.message}` };
  }
}
