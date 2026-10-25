// Real-time group chat over Socket.io.
// A user joins "<activity>:<today>". At midnight every room is reset and a new one starts.
const { byKey } = require('./lib/activities');
const presence = require('./lib/presence');
const chat = require('./lib/chat');
const { todayKey, msUntilMidnight } = require('./lib/time');
const { verifyToken, parseCookieHeader, COOKIE } = require('./middleware/auth');

const REACTIONS = ['👍', '❤️', '😂', '🔥', '🙌', '😮'];
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

module.exports = function attachSockets(io) {
  io.use((socket, next) => {
    try {
      const token = parseCookieHeader(socket.handshake.headers.cookie)[COOKIE];
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  const broadcastPresence = (roomKey) => io.to(roomKey).emit('presence', presence.list(roomKey));
  const lobbyUpdate = () => io.to('lobby').emit('lobby:update');

  io.on('connection', (socket) => {
    const user = { id: socket.user.id, username: socket.user.username };
    socket.data.lastSends = [];

    socket.on('lobby:watch', () => socket.join('lobby'));

    function leaveCurrent() {
      const { roomKey } = socket.data;
      if (!roomKey) return;
      socket.leave(roomKey);
      if (presence.remove(roomKey, user.id)) {
        socket.to(roomKey).emit('notice', `${user.username} left the chat`);
        broadcastPresence(roomKey);
      }
      socket.data.roomKey = null;
      socket.data.activity = null;
      lobbyUpdate();
    }

    socket.on('join', ({ activity } = {}, ack) => {
      const a = byKey[activity];
      if (!a) return ack?.({ error: 'Unknown activity' });
      const day = todayKey();
      const roomKey = chat.roomKeyFor(a.key, day);
      const alreadyHere = socket.data.roomKey === roomKey;
      if (!alreadyHere) leaveCurrent();
      socket.join(roomKey);
      socket.data.roomKey = roomKey;
      socket.data.activity = a.key;
      socket.data.day = day;
      const isNew = alreadyHere ? false : presence.add(roomKey, user);
      ack?.({
        activity: a,
        day,
        resetsInMs: msUntilMidnight(),
        messages: chat.history(roomKey),
        meetups: chat.meetups(roomKey),
        online: presence.list(roomKey),
        reactions: REACTIONS,
      });
      if (isNew) socket.to(roomKey).emit('notice', `${user.username} joined the chat`);
      broadcastPresence(roomKey);
      lobbyUpdate();
    });

    socket.on('leave', leaveCurrent);

    // If a socket is still sitting in yesterday's room, move it along.
    function ensureFreshRoom() {
      if (socket.data.day && socket.data.day !== todayKey()) {
        socket.emit('room:reset');
        return false;
      }
      return Boolean(socket.data.roomKey);
    }

    function rateLimited() {
      const now = Date.now();
      socket.data.lastSends = socket.data.lastSends.filter((t) => now - t < 5000);
      if (socket.data.lastSends.length >= 6) return true;
      socket.data.lastSends.push(now);
      return false;
    }

    socket.on('message', ({ body } = {}, ack) => {
      if (!ensureFreshRoom()) return ack?.({ error: 'Join a room first' });
      const text = String(body ?? '').trim().slice(0, 1000);
      if (!text) return ack?.({ error: 'Empty message' });
      if (rateLimited()) return ack?.({ error: 'Slow down a little 🙂' });
      const msg = chat.addMessage({ activity: socket.data.activity, user, body: text });
      io.to(socket.data.roomKey).emit('message', msg);
      lobbyUpdate();
      ack?.({ ok: true });
    });

    socket.on('typing', (isTyping) => {
      if (!socket.data.roomKey) return;
      socket.to(socket.data.roomKey).emit('typing', { username: user.username, isTyping: Boolean(isTyping) });
    });

    socket.on('react', ({ messageId, emoji } = {}) => {
      if (!ensureFreshRoom() || !REACTIONS.includes(emoji)) return;
      const msg = chat.messageById(Number(messageId));
      if (!msg || msg.room_key !== socket.data.roomKey) return;
      const reactions = chat.toggleReaction(msg.id, user.id, emoji);
      io.to(socket.data.roomKey).emit('reaction', { messageId: msg.id, reactions });
    });

    socket.on('meetup:create', ({ title, place, time } = {}, ack) => {
      if (!ensureFreshRoom()) return ack?.({ error: 'Join a room first' });
      const t = clean(title, 80), p = clean(place, 80), tm = clean(time, 40);
      if (!t || !p || !tm) return ack?.({ error: 'Fill in what, where and when.' });
      if (rateLimited()) return ack?.({ error: 'Slow down a little 🙂' });
      const meetup = chat.addMeetup({ activity: socket.data.activity, user, title: t, place: p, timeText: tm });
      io.to(socket.data.roomKey).emit('meetup:new', meetup);
      const msg = chat.addMessage({
        activity: socket.data.activity, user, kind: 'system',
        body: `📅 ${user.username} proposed "${t}" at ${p}, ${tm}. RSVP in the plans panel!`,
      });
      io.to(socket.data.roomKey).emit('message', msg);
      ack?.({ ok: true });
    });

    socket.on('meetup:vote', ({ meetupId, vote } = {}) => {
      if (!ensureFreshRoom() || !['yes', 'maybe', 'no'].includes(vote)) return;
      const meetup = chat.meetups(socket.data.roomKey).find((m) => m.id === Number(meetupId));
      if (!meetup) return;
      io.to(socket.data.roomKey).emit('meetup:update', chat.voteMeetup(meetup.id, user.id, vote));
    });

    socket.on('disconnect', leaveCurrent);
  });

  // Daily rollover: clear yesterday's rooms and tell everyone to rejoin today's.
  function scheduleMidnight() {
    setTimeout(() => {
      const purged = chat.purgeOldRooms();
      console.log(`[rollover] New day ${todayKey()} — removed ${purged.messages} messages, ${purged.meetups} plans`);
      io.emit('room:reset');
      scheduleMidnight();
    }, msUntilMidnight() + 1000);
  }
  scheduleMidnight();
};
