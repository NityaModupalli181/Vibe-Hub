const express = require('express');
const { ACTIVITIES, byKey } = require('../lib/activities');
const presence = require('../lib/presence');
const chat = require('../lib/chat');
const { todayKey, msUntilMidnight } = require('../lib/time');

const router = express.Router();

router.get('/activities', (req, res) => {
  const day = todayKey();
  res.json({
    day,
    resetsInMs: msUntilMidnight(),
    activities: ACTIVITIES.map((a) => ({
      ...a,
      online: presence.count(chat.roomKeyFor(a.key, day)),
      messagesToday: chat.messageCountToday(a.key),
    })),
  });
});

router.get('/:activity', (req, res) => {
  const activity = byKey[req.params.activity];
  if (!activity) return res.status(404).json({ error: 'Unknown activity.' });
  const roomKey = chat.roomKeyFor(activity.key);
  res.json({
    activity,
    day: todayKey(),
    resetsInMs: msUntilMidnight(),
    messages: chat.history(roomKey),
    meetups: chat.meetups(roomKey),
    online: presence.list(roomKey),
  });
});

module.exports = router;
