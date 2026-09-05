const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM logs ORDER BY at DESC LIMIT 200').all();
  res.json({ logs: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.description) return res.status(400).json({ error: 'Description is required' });
  const id = uuid();
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(id, b.type || 'Other', b.description, b.by || req.user.name, new Date().toISOString());
  res.status(201).json({ log: db.prepare('SELECT * FROM logs WHERE id = ?').get(id) });
});

module.exports = router;
