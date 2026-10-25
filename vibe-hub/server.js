const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

require('./db');
const { seed } = require('./seed');
const { requireAuth } = require('./middleware/auth');
const chat = require('./lib/chat');

seed();
chat.purgeOldRooms();

const app = express();
app.disable('x-powered-by');
// Behind a hosting proxy (Render, Railway, etc.): use the real visitor IP for rate limiting
app.set('trust proxy', 1);

// Health check for the hosting platform
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/solo', requireAuth, require('./routes/solo'));
app.use('/api/group', requireAuth, require('./routes/group'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC, { extensions: ['html'] }));
app.get('/app', (req, res) => res.sendFile(path.join(PUBLIC, 'app.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.type === 'entity.too.large' ? 'Upload too large.' : 'Something went wrong.' });
});

const server = http.createServer(app);
const io = new Server(server);
require('./socket')(io);

// Hourly safety net in case the server slept through midnight
setInterval(() => chat.purgeOldRooms(), 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✨ Vibe Hub running at http://localhost:${PORT}`);
});
