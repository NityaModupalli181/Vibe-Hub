// JWT auth stored in an httpOnly cookie named "token".
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  // No secret configured: create one once and keep it in data/ so logins survive restarts.
  const file = path.join(__dirname, '..', 'data', '.jwt_secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  }
}

const SECRET = loadSecret();
const COOKIE = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signUser(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

function parseCookieHeader(header = '') {
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

module.exports = {
  COOKIE, signUser, verifyToken, setAuthCookie, clearAuthCookie, requireAuth, parseCookieHeader,
};
