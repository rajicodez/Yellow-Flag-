/**
 * 2026 F1 Teams — ordered by the 2025 Constructors' Championship finishing
 * positions (McLaren 1st → Alpine 10th), with brand-new Cadillac last.
 * Within each team, drivers[0] is the higher 2025 Drivers' Championship finisher.
 *
 * Logos: Wikimedia Commons + Simple Icons. invertLogo flips dark artwork for the dark UI.
 */
export const teamsIntro =
  'All 11 teams on the 2026 Formula 1 grid — full team names, driver lineups, and power units.';

const WIKI = 'https://upload.wikimedia.org/wikipedia/commons';
// Some team marks are non-free and live on the English Wikipedia rather than Commons.
const WIKI_EN = 'https://upload.wikimedia.org/wikipedia/en';
const SI = 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons';

export const f1Teams2026 = [
  // 2025 Constructors P1
  {
    id: 1,
    name: 'McLaren Formula 1 Team',
    drivers: ['Lando Norris', 'Oscar Piastri'], // 2025: P1, P3
    engine: 'Mercedes Power Unit',
    logoUrl: `${WIKI}/d/d0/McLaren_Speedmark_(white).svg`,
    invertLogo: false,
    description:
      'Founded by racer Bruce McLaren in 1966, McLaren are the second-oldest and second-most successful team in Formula 1 with over 200 Grand Prix wins. Fresh off back-to-back Constructors\u2019 Championships in 2024 and 2025 — and with Lando Norris crowned 2025 World Champion — the papaya squad enters 2026 as the benchmark of the grid.',
    country: 'United Kingdom (Woking)',
    championships: '10',
    teamPrincipal: 'Andrea Stella',
    owner: 'McLaren Group',
    mainSponsor: 'Mastercard (Official Naming Partner)',
  },
  // 2025 Constructors P2
  {
    id: 2,
    name: 'Mercedes-AMG Petronas F1 Team',
    drivers: ['George Russell', 'Kimi Antonelli'], // 2025: P4, P7
    engine: 'Mercedes Power Unit',
    logoUrl: `${WIKI}/f/fc/Mercedes-AMG_Petronas_F1_Team_logo_(2026).svg`,
    invertLogo: true,
    description:
      'The Silver Arrows returned as a works team in 2010 and went on to define an era, winning a record eight consecutive Constructors\u2019 Championships from 2014 to 2021. Based in Brackley and led by the longest-serving boss on the grid, Mercedes pairs George Russell with Italian prodigy Kimi Antonelli for the new regulations era.',
    country: 'United Kingdom (Brackley)',
    championships: '8',
    teamPrincipal: 'Toto Wolff',
    owner: 'Mercedes-Benz Group, INEOS & Toto Wolff',
    mainSponsor: 'Petronas',
  },
  // 2025 Constructors P3
  {
    id: 4,
    name: 'Oracle Red Bull Racing',
    drivers: ['Max Verstappen', 'Isack Hadjar'], // 2025: P2, P12
    engine: 'Red Bull Ford Power Unit',
    logoUrl: `${SI}/redbull.svg`,
    invertLogo: true,
    description:
      'From energy-drink upstarts in 2005 to serial champions, Red Bull Racing claimed six Constructors\u2019 titles across the Vettel and Verstappen eras. 2026 opens a bold new chapter: the Milton Keynes squad now races with its own in-house Red Bull Ford power unit, with Max Verstappen joined by Isack Hadjar.',
    country: 'United Kingdom (Milton Keynes)',
    championships: '6',
    teamPrincipal: 'Laurent Mekies',
    owner: 'Red Bull GmbH',
    mainSponsor: 'Oracle',
  },
  // 2025 Constructors P4
  {
    id: 3,
    name: 'Scuderia Ferrari HP',
    drivers: ['Charles Leclerc', 'Lewis Hamilton'], // 2025: P5, P6
    engine: 'Ferrari Power Unit',
    logoUrl: `${SI}/ferrari.svg`,
    invertLogo: true,
    description:
      'The Scuderia is the only team to have competed in every Formula 1 season since 1950 and remains the sport\u2019s most successful and most iconic constructor, with a record 16 Constructors\u2019 crowns. With seven-time champion Lewis Hamilton alongside Charles Leclerc, Maranello is hunting its first title since 2008.',
    country: 'Italy (Maranello)',
    championships: '16',
    teamPrincipal: 'Fr\u00e9d\u00e9ric Vasseur',
    owner: 'Ferrari N.V. (Exor)',
    mainSponsor: 'HP',
  },
  // 2025 Constructors P5
  {
    id: 5,
    name: 'Atlassian Williams Racing',
    drivers: ['Alex Albon', 'Carlos Sainz'], // 2025: P8, P9
    engine: 'Mercedes Power Unit',
    logoUrl: `${WIKI}/1/12/Atlassian_Williams_F1_Team_logo.svg`,
    invertLogo: true,
    description:
      'Founded by Sir Frank Williams and Patrick Head in 1977, Williams are one of Formula 1\u2019s great independent success stories with nine Constructors\u2019 Championships. Under James Vowles and Atlassian title backing, the Grove squad is charging back toward the front with Carlos Sainz and Alex Albon.',
    country: 'United Kingdom (Grove)',
    championships: '9',
    teamPrincipal: 'James Vowles',
    owner: 'Dorilton Capital',
    mainSponsor: 'Atlassian',
  },
  // 2025 Constructors P6 (Racing Bulls / RB)
  {
    id: 6,
    name: 'Visa Cash App Racing Bulls',
    drivers: ['Liam Lawson', 'Arvid Lindblad'], // 2025: Lawson P14; Lindblad — rookie
    engine: 'Red Bull Ford Power Unit',
    // The sister team has its own mark — the plain Red Bull bull belongs to
    // Oracle Red Bull Racing. This one is full-colour, so it must not invert.
    logoUrl: `${WIKI_EN}/2/2b/VCARB_F1_logo.svg`,
    invertLogo: false,
    description:
      'Born from the plucky Minardi outfit in Faenza and formerly racing as Toro Rosso and AlphaTauri, Red Bull\u2019s sister team is famous for developing young talent — and for Sebastian Vettel\u2019s fairytale maiden win at Monza in 2008. Liam Lawson leads highly-rated rookie Arvid Lindblad in 2026.',
    country: 'Italy (Faenza)',
    championships: '0',
    teamPrincipal: 'Alan Permane',
    owner: 'Red Bull GmbH',
    mainSponsor: 'Visa & Cash App',
  },
  // 2025 Constructors P7
  {
    id: 7,
    name: 'Aston Martin Aramco F1 Team',
    drivers: ['Fernando Alonso', 'Lance Stroll'], // 2025: P10, P16
    engine: 'Honda Power Unit',
    logoUrl: `${SI}/astonmartin.svg`,
    invertLogo: true,
    description:
      'Tracing its lineage through Jordan, Force India and Racing Point, the Silverstone squad became Aston Martin in 2021 and has been building relentlessly ever since. Now with design legend Adrian Newey at the helm, exclusive works Honda power and Fernando Alonso\u2019s racecraft, the green machine is built to win.',
    country: 'United Kingdom (Silverstone)',
    championships: '0',
    teamPrincipal: 'Adrian Newey',
    owner: 'Lawrence Stroll\u2019s AMR GP consortium',
    mainSponsor: 'Aramco',
  },
  // 2025 Constructors P8
  {
    id: 8,
    name: 'TGR Haas F1 Team',
    drivers: ['Ollie Bearman', 'Esteban Ocon'], // 2025: P13, P15
    engine: 'Ferrari Power Unit',
    logoUrl: `${WIKI}/1/18/TGR_Haas_F1_Team_Logo_(2026).svg`,
    invertLogo: true,
    description:
      'America\u2019s gritty underdog joined the grid in 2016 as Gene Haas\u2019s lean, Ferrari-powered operation. Reinvigorated under Ayao Komatsu and a landmark Toyota Gazoo Racing partnership, Haas fields the experienced Esteban Ocon alongside British rising star Ollie Bearman.',
    country: 'United States (Kannapolis)',
    championships: '0',
    teamPrincipal: 'Ayao Komatsu',
    owner: 'Gene Haas',
    mainSponsor: 'Toyota Gazoo Racing (TGR)',
  },
  // 2025 Constructors P9 (Sauber → Audi)
  {
    id: 10,
    name: 'Audi Revolut F1 Team',
    drivers: ['Nico Hulkenberg', 'Gabriel Bortoleto'], // 2025: P11, P19
    engine: 'Audi Power Unit',
    logoUrl: `${SI}/audi.svg`,
    invertLogo: true,
    description:
      'The four rings finally arrive in Formula 1: Audi has transformed the long-running Sauber operation in Hinwil into a full works team for the 2026 regulations, complete with its own German-engineered power unit. Podium-finisher Nico Hulkenberg and young Brazilian Gabriel Bortoleto lead the charge.',
    country: 'Germany (based in Hinwil, Switzerland)',
    championships: '0',
    teamPrincipal: 'Mattia Binotto',
    owner: 'Audi AG (Volkswagen Group)',
    mainSponsor: 'Revolut',
  },
  // 2025 Constructors P10
  {
    id: 9,
    name: 'BWT Alpine F1 Team',
    drivers: ['Pierre Gasly', 'Franco Colapinto'], // 2025: P18, P20
    engine: 'Mercedes Power Unit',
    logoUrl: `${WIKI}/7/7e/Alpine_F1_Team_Logo.svg`,
    invertLogo: true,
    description:
      'The famous Enstone team has raced as Toleman, Benetton, Renault and now Alpine, winning back-to-back titles with Fernando Alonso in 2005 and 2006. Renault\u2019s sporting spearhead makes a pragmatic switch to Mercedes customer power for 2026, with Pierre Gasly and Franco Colapinto behind the wheel.',
    country: 'France (based in Enstone, UK)',
    championships: '2 (as Renault)',
    teamPrincipal: 'Flavio Briatore & Steve Nielsen',
    owner: 'Renault Group',
    mainSponsor: 'BWT',
  },
  // New 2026 entry — no 2025 constructor result
  {
    id: 11,
    name: 'Cadillac Formula 1 Team',
    drivers: ['Sergio Perez', 'Valtteri Bottas'], // Neither contested 2025; Perez ranked higher in 2024
    engine: 'Ferrari Power Unit',
    logoUrl: `${SI}/cadillac.svg`,
    invertLogo: true,
    description:
      'Formula 1\u2019s brand-new 11th team brings American muscle to the grid, backed by TWG Motorsports and General Motors. Led by racing veteran Graeme Lowdon and running customer Ferrari power while GM develops its own engine, Cadillac signed hugely experienced race winners Valtteri Bottas and Sergio Perez for its debut season.',
    country: 'United States (Fishers, Indiana)',
    championships: '0',
    teamPrincipal: 'Graeme Lowdon',
    owner: 'TWG Motorsports & General Motors',
    mainSponsor: 'No title sponsor (Jim Beam, Tommy Hilfiger, IFS)',
  },
];
