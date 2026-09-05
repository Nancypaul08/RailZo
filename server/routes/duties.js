const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const todayStr = () => new Date().toISOString().slice(0, 10);

function addLog(text) {
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(uuid(), 'Auto', text, 'System', new Date().toISOString());
}

router.get('/', (req, res) => {
  const { date, type } = req.query;
  let rows = db.prepare('SELECT * FROM duties ORDER BY date DESC').all();
  rows = rows.filter(r => r.date === (date || todayStr()));
  if (type && type !== 'all') rows = rows.filter(r => r.type === type);
  res.json({ duties: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Staff name is required' });
  const id = uuid();
  db.prepare(`INSERT INTO duties (id, name, rank, badge, supervisor, type, label, post, shift, attendance, date, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b.name, b.rank || '', b.badge || '', b.supervisor || '', b.type || 'Other', b.label || '',
      b.post || '', b.shift || '', b.attendance || 'Present', todayStr(), req.user.id);
  addLog(`Duty assigned — ${b.name} (${b.type || 'Other'}${b.label ? ': ' + b.label : ''})`);
  res.status(201).json({ duty: db.prepare('SELECT * FROM duties WHERE id = ?').get(id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM duties WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
