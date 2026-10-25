const express = require('express');
const db = require('../db');

const router = express.Router();

// Public: the login page shows quotes too
router.get('/', (req, res) => {
  const quotes = db.prepare('SELECT id, text, author FROM quotes ORDER BY RANDOM()').all();
  res.json({ quotes });
});

module.exports = router;
