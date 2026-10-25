// Database helpers for the daily group chat rooms.
const db = require('../db');
const { todayKey } = require('./time');

const roomKeyFor = (activity, day = todayKey()) => `${activity}:${day}`;

function reactionsFor(messageIds) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT r.message_id, r.emoji, u.username FROM message_reactions r
    JOIN users u ON u.id = r.user_id WHERE r.message_id IN (${placeholders})`).all(...messageIds);
  const out = {};
  rows.forEach((r) => {
    out[r.message_id] ??= {};
    (out[r.message_id][r.emoji] ??= []).push(r.username);
  });
  return out;
}

function messageById(id) {
  const m = db.prepare('SELECT * FROM group_messages WHERE id = ?').get(id);
  if (!m) return null;
  return { ...m, reactions: reactionsFor([m.id])[m.id] || {} };
}

function history(roomKey, limit = 200) {
  const rows = db.prepare(`SELECT * FROM (SELECT * FROM group_messages WHERE room_key = ? ORDER BY id DESC LIMIT ?)
    ORDER BY id ASC`).all(roomKey, limit);
  const reactions = reactionsFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, reactions: reactions[r.id] || {} }));
}

function addMessage({ activity, user, body, kind = 'text' }) {
  const day = todayKey();
  const info = db.prepare(`INSERT INTO group_messages (room_key, activity, room_date, user_id, username, body, kind)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(roomKeyFor(activity, day), activity, day, user?.id ?? null, user?.username ?? 'system', body, kind);
  return messageById(Number(info.lastInsertRowid));
}

// Toggles a reaction; returns the message's updated reaction map
function toggleReaction(messageId, userId, emoji) {
  const has = db.prepare('SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').get(messageId, userId, emoji);
  if (has) db.prepare('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').run(messageId, userId, emoji);
  else db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(messageId, userId, emoji);
  return reactionsFor([messageId])[messageId] || {};
}

function meetupWithVotes(m) {
  const votes = db.prepare(`SELECT v.vote, u.username FROM meetup_votes v JOIN users u ON u.id = v.user_id
    WHERE v.meetup_id = ? ORDER BY u.username`).all(m.id);
  const grouped = { yes: [], maybe: [], no: [] };
  votes.forEach((v) => grouped[v.vote].push(v.username));
  return { ...m, votes: grouped };
}

function meetups(roomKey) {
  return db.prepare('SELECT * FROM meetups WHERE room_key = ? ORDER BY id ASC').all(roomKey).map(meetupWithVotes);
}

function addMeetup({ activity, user, title, place, timeText }) {
  const day = todayKey();
  const info = db.prepare(`INSERT INTO meetups (room_key, room_date, user_id, username, title, place, time_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(roomKeyFor(activity, day), day, user.id, user.username, title, place, timeText);
  const id = Number(info.lastInsertRowid);
  // The creator is automatically "going"
  db.prepare('INSERT OR REPLACE INTO meetup_votes (meetup_id, user_id, vote) VALUES (?, ?, ?)').run(id, user.id, 'yes');
  return meetupWithVotes(db.prepare('SELECT * FROM meetups WHERE id = ?').get(id));
}

function voteMeetup(meetupId, userId, vote) {
  const current = db.prepare('SELECT vote FROM meetup_votes WHERE meetup_id = ? AND user_id = ?').get(meetupId, userId);
  if (current?.vote === vote) db.prepare('DELETE FROM meetup_votes WHERE meetup_id = ? AND user_id = ?').run(meetupId, userId);
  else db.prepare('INSERT OR REPLACE INTO meetup_votes (meetup_id, user_id, vote) VALUES (?, ?, ?)').run(meetupId, userId, vote);
  return meetupWithVotes(db.prepare('SELECT * FROM meetups WHERE id = ?').get(meetupId));
}

// Rooms only live for their own day. Older chats are deleted.
function purgeOldRooms() {
  const day = todayKey();
  const a = db.prepare('DELETE FROM group_messages WHERE room_date < ?').run(day).changes;
  const b = db.prepare('DELETE FROM meetups WHERE room_date < ?').run(day).changes;
  return { messages: a, meetups: b };
}

function messageCountToday(activity) {
  return db.prepare("SELECT COUNT(*) AS n FROM group_messages WHERE room_key = ? AND kind != 'system'").get(roomKeyFor(activity)).n;
}

module.exports = {
  roomKeyFor, history, addMessage, messageById, toggleReaction, meetups, addMeetup, voteMeetup, purgeOldRooms, messageCountToday,
};
