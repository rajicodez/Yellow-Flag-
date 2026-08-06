export const dutchGPQuestions = [
  {
    id: 1,
    title: 'Who will take Pole Position at Zandvoort?',
    shortTitle: 'POLE POSITION',
    category: 'Qualifying',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 2,
    title: 'Who will win the Dutch Grand Prix?',
    shortTitle: 'RACE WINNER',
    category: 'Race Result',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 3,
    title: 'Who will finish in P2?',
    shortTitle: 'SECOND PLACE',
    category: 'Race Result',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 4,
    title: 'Who will finish in P3?',
    shortTitle: 'THIRD PLACE',
    category: 'Race Result',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 5,
    title: 'Who will set the fastest lap of the race?',
    shortTitle: 'FASTEST LAP',
    category: 'Race Stats',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 6,
    title: 'Which constructor will score the most points?',
    shortTitle: 'BEST CONSTRUCTOR',
    category: 'Team Performance',
    instruction: 'Select one team',
    type: 'team'
  },
  {
    id: 7,
    title: 'Will there be a Safety Car during the race?',
    shortTitle: 'SAFETY CAR',
    category: 'Race Events',
    instruction: 'Select Yes or No',
    type: 'options',
    options: ['Yes', 'No']
  },
  {
    id: 8,
    title: 'Who will be the first driver to retire from the race?',
    shortTitle: 'FIRST RETIREMENT',
    category: 'Race Events',
    instruction: 'Select one driver or No Retirements',
    type: 'driver',
    allowNoRetirements: true
  },
  {
    id: 9,
    title: 'Who will gain the most positions during the race?',
    shortTitle: 'MOST POSITIONS GAINED',
    category: 'Race Stats',
    instruction: 'Select one driver',
    type: 'driver'
  },
  {
    id: 10,
    title: 'How many drivers will be classified at the end of the race?',
    shortTitle: 'CLASSIFIED FINISHERS',
    category: 'Race Stats',
    instruction: 'Select one range',
    type: 'options',
    options: [
      '20-22 Drivers',
      '17-19 Drivers',
      '14-16 Drivers',
      '10-13 Drivers',
      'Fewer than 10 Drivers'
    ]
  }
];
