/**
 * Championship standings copy + 2026 constructor logo map.
 * Live points still come from the Jolpi (Ergast) API in Standing.jsx.
 * Driver portraits are resolved via getDriverAvatar() in ../data/driverAvatars.js
 * (official F1 media URLs, including Albon / Hulkenberg / Perez).
 */
export const standingsIntro =
  'Follow the current Formula 1 championship battle with Yellow Flag. Switch between Driver Standings and Constructor Standings to see the latest grid.';

const WIKI = 'https://upload.wikimedia.org/wikipedia/commons';
const SI = 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons';

/**
 * 2026 Constructor Championship teams with clean transparent logo URLs.
 * Ordered by the 2025 Constructors' Championship finishing positions
 * (Cadillac appended as the new 2026 entry). Keys match Ergast/Jolpi constructorId values.
 */
export const constructorStandingsData = [
  {
    id: 'mclaren',
    name: 'McLaren',
    logoUrl: `${WIKI}/d/d0/McLaren_Speedmark_(white).svg`,
    invertLogo: false,
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    logoUrl: `${WIKI}/f/fc/Mercedes-AMG_Petronas_F1_Team_logo_(2026).svg`,
    invertLogo: true,
  },
  {
    id: 'red_bull',
    name: 'Red Bull Racing',
    logoUrl: `${SI}/redbull.svg`,
    invertLogo: true,
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    logoUrl: `${SI}/ferrari.svg`,
    invertLogo: true,
  },
  {
    id: 'williams',
    name: 'Williams',
    logoUrl: `${WIKI}/1/12/Atlassian_Williams_F1_Team_logo.svg`,
    invertLogo: true,
  },
  {
    id: 'rb',
    name: 'Racing Bulls',
    logoUrl: `${SI}/redbull.svg`,
    invertLogo: true,
  },
  {
    id: 'aston_martin',
    name: 'Aston Martin',
    logoUrl: `${SI}/astonmartin.svg`,
    invertLogo: true,
  },
  {
    id: 'haas',
    name: 'Haas F1 Team',
    logoUrl: `${WIKI}/1/18/TGR_Haas_F1_Team_Logo_(2026).svg`,
    invertLogo: true,
  },
  {
    id: 'audi',
    name: 'Audi',
    logoUrl: `${SI}/audi.svg`,
    invertLogo: true,
  },
  {
    id: 'alpine',
    name: 'Alpine',
    logoUrl: `${WIKI}/7/7e/Alpine_F1_Team_Logo.svg`,
    invertLogo: true,
  },
  {
    id: 'cadillac',
    name: 'Cadillac',
    logoUrl: `${SI}/cadillac.svg`,
    invertLogo: true,
  },
];

const constructorById = Object.fromEntries(
  constructorStandingsData.map((team) => [team.id, team])
);

const CONSTRUCTOR_ALIASES = {
  kick_sauber: 'audi',
  sauber: 'audi',
  racing_bulls: 'rb',
};

export function getConstructorMeta(constructorId) {
  if (!constructorId) return null;
  const normalized = constructorId.replace(/-/g, '_');
  const resolved = CONSTRUCTOR_ALIASES[normalized] ?? normalized;
  return constructorById[resolved] ?? constructorById[normalized] ?? null;
}
