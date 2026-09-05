const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { q } = req.query;
  let rows = db.prepare('SELECT * FROM officers ORDER BY name ASC').all();
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(o => `${o.name} ${o.station}`.toLowerCase().includes(needle));
  }
  res.json({ officers: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Name is required' });
  const id = uuid();
  db.prepare(`INSERT INTO officers (id, name, rank, badge, station, phone, email, availability, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, b.name, b.rank || '', b.badge || '', b.station || '', b.phone || '', b.email || '', b.availability || 'On duty', req.user.id);
  res.status(201).json({ officer: db.prepare('SELECT * FROM officers WHERE id = ?').get(id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM officers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
