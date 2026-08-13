import { driversData } from '../../data/drivers';
import { f1Teams2026 } from '../../data/teams';

const teamById = new Map(f1Teams2026.map((team) => [team.id, team]));

const initialsFor = (name) => name
  .split(' ')
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const drivers2026 = driversData.map((driver) => {
  const team = teamById.get(driver.teamId);

  return {
    id: driver.id,
    answerId: `driver:${driver.id}`,
    name: driver.name,
    number: driver.number,
    teamId: team?.id ?? driver.teamId,
    teamName: team?.shortName ?? driver.team,
    teamFullName: team?.name ?? driver.team,
    color: team?.color ?? '#FACC15',
    imageUrl: driver.avatarUrl,
    initials: initialsFor(driver.name),
    searchText: `${driver.name} ${driver.number} #${driver.number} ${team?.shortName ?? driver.team} ${team?.name ?? ''}`.toLowerCase(),
  };
});

const constructors2026 = f1Teams2026.map((team) => ({
  id: team.id,
  answerId: `constructor:${team.id}`,
  name: team.shortName,
  fullName: team.name,
  color: team.color,
  logoUrl: team.logoUrl,
  invertLogo: team.invertLogo,
  initials: initialsFor(team.shortName),
  searchText: `${team.shortName} ${team.name}`.toLowerCase(),
}));

export const adminRostersBySeason = {
  2026: {
    drivers: drivers2026,
    constructors: constructors2026,
  },
};

export function getAdminRosterForSeason(season) {
  return adminRostersBySeason[season] ?? { drivers: [], constructors: [] };
}
