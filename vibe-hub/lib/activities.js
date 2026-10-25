// Group activities users can join. Each gets a fresh chat room every day.
const ACTIVITIES = [
  { key: 'table-tennis', name: 'Table Tennis', emoji: '🏓', blurb: 'Rally partners & quick matches' },
  { key: 'badminton',    name: 'Badminton',    emoji: '🏸', blurb: 'Singles, doubles, court bookings' },
  { key: 'bowling',      name: 'Bowling',      emoji: '🎳', blurb: 'Lanes, leagues & strikes' },
  { key: 'dance',        name: 'Dance',        emoji: '💃', blurb: 'Classes, jams & practice buddies' },
  { key: 'basketball',   name: 'Basketball',   emoji: '🏀', blurb: 'Pickup games & shootarounds' },
  { key: 'football',     name: 'Football',     emoji: '⚽', blurb: '5-a-side, kickabouts & full matches' },
  { key: 'gym',          name: 'Gym',          emoji: '🏋️', blurb: 'Workout buddies & spotters' },
];

const byKey = Object.fromEntries(ACTIVITIES.map((a) => [a.key, a]));

module.exports = { ACTIVITIES, byKey };
