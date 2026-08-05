const F1_MEDIA =
  'https://media.formula1.com/image/upload/c_fill,w_400,h_400,g_face/q_auto/v1740000000/common/f1/2026';

function webp(team, code) {
  return `${F1_MEDIA}/${team}/${code}/2026${team}${code}right.webp`;
}

/** Official F1 media headshots keyed by canonical full name. */
export const driverAvatars = {
  'George Russell': webp('mercedes', 'georus01'),
  'Kimi Antonelli': webp('mercedes', 'andant01'),
  'Andrea Kimi Antonelli': webp('mercedes', 'andant01'),
  'Isack Hadjar': webp('redbullracing', 'isahad01'),
  'Charles Leclerc': webp('ferrari', 'chalec01'),
  'Oscar Piastri': webp('mclaren', 'oscpia01'),
  'Lando Norris': webp('mclaren', 'lannor01'),
  'Lewis Hamilton': webp('ferrari', 'lewham01'),
  'Liam Lawson': webp('racingbulls', 'lialaw01'),
  'Arvid Lindblad': webp('racingbulls', 'arvlin01'),
  'Gabriel Bortoleto': webp('audi', 'gabbor01'),
  'Nico Hulkenberg': webp('audi', 'nichul01'),
  'Nico Hülkenberg': webp('audi', 'nichul01'),
  'Ollie Bearman': webp('haas', 'olibea01'),
  'Oliver Bearman': webp('haas', 'olibea01'),
  'Esteban Ocon': webp('haas', 'estoco01'),
  'Pierre Gasly': webp('alpine', 'piegas01'),
  'Alex Albon': webp('williams', 'alealb01'),
  'Alexander Albon': webp('williams', 'alealb01'),
  'Franco Colapinto': webp('alpine', 'fracol01'),
  'Fernando Alonso': webp('astonmartin', 'feralo01'),
  'Sergio Perez': webp('cadillac', 'serper01'),
  'Sergio Pérez': webp('cadillac', 'serper01'),
  'Valtteri Bottas': webp('cadillac', 'valbot01'),
  'Max Verstappen': webp('redbullracing', 'maxver01'),
  'Carlos Sainz': webp('williams', 'carsai01'),
  'Lance Stroll': webp('astonmartin', 'lanstr01'),
};

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDriverAvatar(name) {
  if (!name) return null;
  if (driverAvatars[name]) return driverAvatars[name];
  const normalized = normalizeName(name);
  if (driverAvatars[normalized]) return driverAvatars[normalized];
  const match = Object.entries(driverAvatars).find(
    ([key]) => normalizeName(key) === normalized
  );
  return match ? match[1] : null;
}

export function getDriverInitials(name) {
  return (name ?? '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
