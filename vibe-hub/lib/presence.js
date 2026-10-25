// In-memory record of who is currently online in each group room.
// roomKey -> Map(userId -> { username, sockets })
const rooms = new Map();

function add(roomKey, user) {
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Map());
  const room = rooms.get(roomKey);
  const entry = room.get(user.id);
  if (entry) {
    entry.sockets += 1;
    return false; // user was already present (another tab)
  }
  room.set(user.id, { username: user.username, sockets: 1 });
  return true; // newly arrived
}

function remove(roomKey, userId) {
  const room = rooms.get(roomKey);
  if (!room) return false;
  const entry = room.get(userId);
  if (!entry) return false;
  entry.sockets -= 1;
  if (entry.sockets <= 0) {
    room.delete(userId);
    if (room.size === 0) rooms.delete(roomKey);
    return true; // user fully left
  }
  return false;
}

function list(roomKey) {
  const room = rooms.get(roomKey);
  if (!room) return [];
  return [...room.entries()]
    .map(([id, v]) => ({ id, username: v.username }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

function count(roomKey) {
  return rooms.get(roomKey)?.size || 0;
}

function roomKeys() {
  return [...rooms.keys()];
}

module.exports = { add, remove, list, count, roomKeys };
