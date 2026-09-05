const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { LF_STAGES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

function addLog(text) {
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(uuid(), 'Auto', text, 'System', new Date().toISOString());
}

router.get('/', (req, res) => {
  const { status, category } = req.query;
  let rows = db.prepare('SELECT * FROM lostfound ORDER BY created_at DESC').all();
  if (status && status !== 'all') rows = rows.filter(r => r.status === status);
  if (category && category !== 'all') rows = rows.filter(r => r.category === category);
  res.json({ items: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.description) return res.status(400).json({ error: 'Description is required' });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO lostfound (id, category, description, location, found_by, status, claimant_name, claimant_phone, created_at, returned_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b.category || 'Other', b.description, b.location || '', b.foundBy || req.user.name, 'collected', '', '', now, '', req.user.id);
  addLog(`Lost & found item collected — ${b.category || 'Other'}`);
  res.status(201).json({ item: db.prepare('SELECT * FROM lostfound WHERE id = ?').get(id) });
});

router.post('/:id/advance', (req, res) => {
  const row = db.prepare('SELECT * FROM lostfound WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  const idx = LF_STAGES.indexOf(row.status);
  const next = LF_STAGES[idx + 1];
  if (!next) return res.status(400).json({ error: 'Already at final stage' });
  let claimantName = row.claimant_name, claimantPhone = row.claimant_phone, returnedAt = row.returned_at;
  if (next === 'claimed') {
    if (!req.body.claimantName) return res.status(400).json({ error: 'Claimant name is required to mark as claimed' });
    claimantName = req.body.claimantName; claimantPhone = req.body.claimantPhone || '';
  }
  if (next === 'returned') returnedAt = new Date().toISOString();
  db.prepare('UPDATE lostfound SET status=?, claimant_name=?, claimant_phone=?, returned_at=? WHERE id=?')
    .run(next, claimantName, claimantPhone, returnedAt, req.params.id);
  addLog(`${row.category} item moved to ${next}`);
  res.json({ item: db.prepare('SELECT * FROM lostfound WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM lostfound WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
