const express = require('express');
const db = require('../db');
const { todayKey, seededRandom } = require('../lib/time');
const { doodleTips } = require('../seed');
const online = require('../lib/online');

const router = express.Router();
const parseJSON = (s, fallback = []) => { try { return JSON.parse(s); } catch { return fallback; } };

/* ------------------------------ Doodle ------------------------------ */

// Generates (once per day) and stores the doodle prompt by combining the word banks.
function getDailyDoodle(day = todayKey()) {
  const existing = db.prepare('SELECT * FROM daily_doodles WHERE day = ?').get(day);
  if (existing) return existing;

  const rand = seededRandom(`doodle-${day}`);
  const words = (kind) => db.prepare('SELECT word FROM doodle_words WHERE kind = ? ORDER BY id').all(kind).map((r) => r.word);
  const choose = (arr) => arr[Math.floor(rand() * arr.length)];
  const adj = choose(words('adjective'));
  const subject = choose(words('subject'));
  const action = choose(words('action'));
  const article = /^[aeiou]/i.test(adj) ? 'An' : 'A';
  const prompt = `${article} ${adj} ${subject} ${action}`;
  const tip = choose(doodleTips);

  db.prepare('INSERT OR IGNORE INTO daily_doodles (day, prompt, tip) VALUES (?, ?, ?)').run(day, prompt, tip);
  return db.prepare('SELECT * FROM daily_doodles WHERE day = ?').get(day);
}

router.get('/doodle/today', (req, res) => {
  const d = getDailyDoodle();
  const mine = db.prepare('SELECT COUNT(*) AS n FROM doodles WHERE user_id = ? AND day = ?').get(req.user.id, d.day).n;
  res.json({ day: d.day, prompt: d.prompt, tip: d.tip, submittedToday: mine });
});

router.post('/doodle', (req, res) => {
  const image = String(req.body.image || '');
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(image)) return res.status(400).json({ error: 'Invalid image.' });
  if (image.length > 2_500_000) return res.status(413).json({ error: 'Drawing is too large.' });
  const d = getDailyDoodle();
  const info = db.prepare('INSERT INTO doodles (user_id, day, prompt, image_data) VALUES (?, ?, ?, ?)')
    .run(req.user.id, d.day, d.prompt, image);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.get('/doodle/mine', (req, res) => {
  const rows = db.prepare(`SELECT id, day, prompt, image_data, created_at FROM doodles
    WHERE user_id = ? ORDER BY id DESC LIMIT 30`).all(req.user.id);
  res.json({ doodles: rows });
});

// Everyone's drawings for today's prompt
router.get('/doodle/community', (req, res) => {
  const rows = db.prepare(`SELECT d.id, d.image_data, d.created_at, u.username FROM doodles d
    JOIN users u ON u.id = d.user_id WHERE d.day = ? ORDER BY d.id DESC LIMIT 40`).all(todayKey());
  res.json({ doodles: rows });
});

router.delete('/doodle/:id', (req, res) => {
  const info = db.prepare('DELETE FROM doodles WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ deleted: info.changes > 0 });
});

/* ------------------------------ Cooking ------------------------------ */

function localRecipe(diet, excludeTitle) {
  const row = db.prepare('SELECT * FROM recipes WHERE diet = ? AND title != ? ORDER BY RANDOM() LIMIT 1')
    .get(diet, excludeTitle || '') || db.prepare('SELECT * FROM recipes WHERE diet = ? ORDER BY RANDOM() LIMIT 1').get(diet);
  if (!row) return null;
  return {
    title: row.title, cuisine: row.cuisine, diet: row.diet, minutes: row.minutes, serves: row.serves,
    ingredients: parseJSON(row.ingredients), steps: parseJSON(row.steps), image: null,
    source: 'Vibe Hub kitchen', sourceUrl: null,
  };
}

router.get('/recipe', async (req, res) => {
  const diet = req.query.diet === 'nonveg' ? 'nonveg' : 'veg';
  const preferLocal = req.query.source === 'local';
  const recipe = (!preferLocal && (await online.recipeFromMealDB(diet))) || localRecipe(diet, req.query.exclude);
  if (!recipe) return res.status(404).json({ error: 'No recipe found.' });
  res.json({ recipe });
});

/* ------------------------------ Reading ------------------------------ */

function localReading(kind, excludeTitle) {
  const where = kind === 'any' ? '' : 'WHERE kind = @kind';
  const row = db.prepare(`SELECT * FROM readings ${where ? where + ' AND' : 'WHERE'} title != @ex ORDER BY RANDOM() LIMIT 1`)
    .get({ kind, ex: excludeTitle || '' });
  return row ? { ...row, source: row.author === 'Vibe Hub Originals' ? 'Vibe Hub library' : 'Public domain', sourceUrl: null } : null;
}

router.get('/reading', async (req, res) => {
  let kind = ['story', 'poem', 'article', 'any'].includes(req.query.kind) ? req.query.kind : 'any';
  if (kind === 'any') kind = ['story', 'poem', 'article'][Math.floor(Math.random() * 3)];

  let item = null;
  if (req.query.source !== 'local') {
    if (kind === 'poem') item = await online.poemFromPoetryDB();
    if (kind === 'article') item = await online.articleFromWikipedia();
  }
  item = item || localReading(kind, req.query.exclude);
  if (!item) return res.status(404).json({ error: 'Nothing to read right now.' });
  const words = item.body.split(/\s+/).length;
  res.json({ reading: { ...item, minutes: Math.max(1, Math.round(words / 200)) } });
});

/* ------------------------------ Makeup ------------------------------ */

router.get('/makeup/vibes', (req, res) => {
  const vibes = db.prepare('SELECT DISTINCT vibe FROM makeup_looks ORDER BY vibe').all().map((r) => r.vibe);
  res.json({ vibes });
});

router.get('/makeup', (req, res) => {
  const vibe = req.query.vibe;
  const ex = req.query.exclude || '';
  const row = vibe && vibe !== 'any'
    ? db.prepare('SELECT * FROM makeup_looks WHERE vibe = ? ORDER BY RANDOM() LIMIT 1').get(vibe)
    : db.prepare('SELECT * FROM makeup_looks WHERE name != ? ORDER BY RANDOM() LIMIT 1').get(ex);
  if (!row) return res.status(404).json({ error: 'No look found.' });
  res.json({
    look: { ...row, palette: parseJSON(row.palette), products: parseJSON(row.products), steps: parseJSON(row.steps) },
  });
});

/* ------------------------------ Favourites ------------------------------ */

router.get('/favorites', (req, res) => {
  const rows = db.prepare('SELECT id, kind, title, payload, created_at FROM favorites WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id).map((r) => ({ ...r, payload: parseJSON(r.payload, {}) }));
  res.json({ favorites: rows });
});

router.post('/favorites', (req, res) => {
  const kind = String(req.body.kind || '');
  const payload = req.body.payload;
  if (!['recipe', 'reading', 'makeup'].includes(kind) || !payload?.title) {
    return res.status(400).json({ error: 'Invalid favourite.' });
  }
  const json = JSON.stringify(payload);
  if (json.length > 100_000) return res.status(413).json({ error: 'Too large.' });
  const dup = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND kind = ? AND title = ?').get(req.user.id, kind, payload.title);
  if (dup) return res.json({ id: dup.id, duplicate: true });
  const info = db.prepare('INSERT INTO favorites (user_id, kind, title, payload) VALUES (?, ?, ?, ?)')
    .run(req.user.id, kind, String(payload.title).slice(0, 200), json);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.delete('/favorites/:id', (req, res) => {
  const info = db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ deleted: info.changes > 0 });
});

module.exports = router;
module.exports.getDailyDoodle = getDailyDoodle;
