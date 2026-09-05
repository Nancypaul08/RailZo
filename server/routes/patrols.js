const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function addLog(text) {
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(uuid(), 'Auto', text, 'System', new Date().toISOString());
}
const todayStr = () => new Date().toISOString().slice(0, 10);

router.get('/', (req, res) => {
  const { status, date } = req.query;
  let rows = db.prepare('SELECT * FROM patrols ORDER BY date DESC').all();
  if (status && status !== 'all') rows = rows.filter(r => r.status === status);
  if (date) rows = rows.filter(r => r.date === date);
  res.json({ patrols: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Patrol name is required' });
  const id = uuid();
  const status = b.status || 'scheduled';
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO patrols (id, name, officer, area, shift, gps, status, date, started_at, completed_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b.name, b.officer || '', b.area || '', b.shift || '', b.gps || '', status, todayStr(),
      status === 'active' ? now : '', '', req.user.id);
  addLog(`Patrol scheduled — ${b.name}`);
  res.status(201).json({ patrol: db.prepare('SELECT * FROM patrols WHERE id = ?').get(id) });
});

router.post('/:id/start', (req, res) => {
  const row = db.prepare('SELECT * FROM patrols WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Patrol not found' });
  db.prepare('UPDATE patrols SET status = ?, started_at = ? WHERE id = ?').run('active', new Date().toISOString(), req.params.id);
  addLog(`Patrol started — ${row.name}`);
  res.json({ patrol: db.prepare('SELECT * FROM patrols WHERE id = ?').get(req.params.id) });
});

router.post('/:id/complete', (req, res) => {
  const row = db.prepare('SELECT * FROM patrols WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Patrol not found' });
  db.prepare('UPDATE patrols SET status = ?, completed_at = ? WHERE id = ?').run('completed', new Date().toISOString(), req.params.id);
  addLog(`Patrol completed — ${row.name}`);
  res.json({ patrol: db.prepare('SELECT * FROM patrols WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM patrols WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
