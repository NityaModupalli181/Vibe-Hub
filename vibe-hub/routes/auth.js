const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signUser, setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Very small in-memory limiter for login attempts (per IP)
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 20;
}

router.post('/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 letters, numbers or underscores.' });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const exists = db.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) {
    const field = exists.username.toLowerCase() === username.toLowerCase() ? 'Username' : 'Email';
    return res.status(409).json({ error: `${field} is already taken.` });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
  const user = { id: Number(info.lastInsertRowid), username };
  setAuthCookie(res, signUser(user));
  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  if (tooManyAttempts(req.ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');
  const row = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login.toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Wrong username/email or password.' });
  }
  const user = { id: row.id, username: row.username };
  setAuthCookie(res, signUser(user));
  res.json({ user });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!row) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Account not found.' });
  }
  const stats = {
    doodles: db.prepare('SELECT COUNT(*) AS n FROM doodles WHERE user_id = ?').get(row.id).n,
    favorites: db.prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?').get(row.id).n,
    messages: db.prepare('SELECT COUNT(*) AS n FROM group_messages WHERE user_id = ?').get(row.id).n,
  };
  res.json({ user: row, stats });
});

module.exports = router;
