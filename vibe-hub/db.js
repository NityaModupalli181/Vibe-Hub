// SQLite database connection + schema.
// The database file lives at ./data/vibehub.db and is created automatically.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(process.env.DB_PATH || path.join(DATA_DIR, 'vibehub.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  text   TEXT NOT NULL,
  author TEXT NOT NULL
);

-- Word banks the app combines to generate a new doodle prompt every day
CREATE TABLE IF NOT EXISTS doodle_words (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('adjective','subject','action')),
  word TEXT NOT NULL
);

-- The generated "doodle of the day" (one row per calendar day)
CREATE TABLE IF NOT EXISTS daily_doodles (
  day    TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  tip    TEXT NOT NULL
);

-- Drawings users save
CREATE TABLE IF NOT EXISTS doodles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  prompt     TEXT NOT NULL,
  image_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  diet        TEXT NOT NULL CHECK (diet IN ('veg','nonveg')),
  title       TEXT NOT NULL,
  cuisine     TEXT,
  minutes     INTEGER,
  serves      INTEGER,
  ingredients TEXT NOT NULL, -- JSON array of strings
  steps       TEXT NOT NULL  -- JSON array of strings
);

CREATE TABLE IF NOT EXISTS readings (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  kind   TEXT NOT NULL CHECK (kind IN ('story','poem','article')),
  title  TEXT NOT NULL,
  author TEXT NOT NULL,
  body   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS makeup_looks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  vibe     TEXT NOT NULL,
  occasion TEXT NOT NULL,
  palette  TEXT NOT NULL, -- JSON array of {name, hex}
  products TEXT NOT NULL, -- JSON array of strings
  steps    TEXT NOT NULL  -- JSON array of strings
);

-- Saved favourites (recipes / readings / looks) per user
CREATE TABLE IF NOT EXISTS favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Group chat: one room per activity per day (room_key = "<activity>:<YYYY-MM-DD>")
CREATE TABLE IF NOT EXISTS group_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key   TEXT NOT NULL,
  activity   TEXT NOT NULL,
  room_date  TEXT NOT NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT NOT NULL,
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'text',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_msg_room ON group_messages(room_key, id);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id INTEGER NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

-- "Let's meet at..." plans inside a group room, with RSVPs
CREATE TABLE IF NOT EXISTS meetups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key   TEXT NOT NULL,
  room_date  TEXT NOT NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT NOT NULL,
  title      TEXT NOT NULL,
  place      TEXT NOT NULL,
  time_text  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_meetup_room ON meetups(room_key);

CREATE TABLE IF NOT EXISTS meetup_votes (
  meetup_id INTEGER NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote      TEXT NOT NULL CHECK (vote IN ('yes','maybe','no')),
  PRIMARY KEY (meetup_id, user_id)
);
`);

module.exports = db;
