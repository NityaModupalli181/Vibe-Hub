// Day helpers. Group rooms and the doodle of the day roll over at local midnight
// (server time zone). Set TZ in the environment to change it, e.g. TZ=Asia/Kolkata.

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function msUntilMidnight(d = new Date()) {
  const next = new Date(d);
  next.setHours(24, 0, 0, 0);
  return next - d;
}

// Small deterministic PRNG so the same day always yields the same doodle prompt.
// Credit: this is the public-domain "xmur3" string hash by bryc
// (https://github.com/bryc/code/blob/master/jshash/PRNGs.md), which uses the
// MurmurHash3 mixing constants by Austin Appleby. Each call returns a number in [0, 1).
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

module.exports = { todayKey, msUntilMidnight, seededRandom };
