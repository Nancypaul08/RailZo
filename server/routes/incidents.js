const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { nextCaseId } = require('../caseId');
const { INCIDENT_STAGES, INCIDENT_LABELS } = require('../constants');
const { scoreCase } = require('../risk');

const router = express.Router();
router.use(requireAuth);

function rowToJson(r) {
  const risk = scoreCase(r, 'incident');
  return { ...r, ...risk, riskFactors: risk.factors, timeline: JSON.parse(r.timeline || '[]') };
}
function audit(req, action, resourceId) {
  db.prepare(`INSERT INTO audit_log (id, user_id, user_name, action, resource, resource_id, at, ip) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), req.user.id, req.user.name, action, 'incident', resourceId, new Date().toISOString(), req.ip);
}
function addLog(text) {
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(uuid(), 'Auto', text, 'System', new Date().toISOString());
}
function notify(text, category) {
  db.prepare('INSERT INTO notifications (id, text, category, read, at) VALUES (?,?,?,0,?)')
    .run(uuid(), text, category || 'info', new Date().toISOString());
}

// GET /api/incidents  (filters: type, status, q)
router.get('/', (req, res) => {
  const { type, status, q } = req.query;
  let rows = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  if (type && type !== 'all') rows = rows.filter(r => r.type === type);
  if (status && status !== 'all') rows = rows.filter(r => r.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(r => `${r.type} ${r.station} ${r.description} ${r.train} ${r.case_id} ${r.fir || ''} ${r.gd_entry || ''}`.toLowerCase().includes(needle));
  }
  res.json({ incidents: rows.map(rowToJson) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Incident not found' });
  res.json({ incident: rowToJson(row) });
});

// POST /api/incidents
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.description && !b.station) return res.status(400).json({ error: 'Provide at least a station or description' });
  const id = uuid();
  const caseId = nextCaseId('TRK');
  const now = new Date().toISOString();
  const timeline = [{ t: now, text: 'Reported' }];
  db.prepare(`INSERT INTO incidents
    (id, case_id, type, priority, status, station, platform, train, coach, gd_entry, fir, gps, reporter, assigned, description, remarks, photo, timeline, created_at, assigned_at, resolved_at, closed_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, caseId, b.type || 'Other', b.priority || 'Medium', 'reported',
      b.station || '', b.platform || '', b.train || '', b.coach || '',
      b.gdEntry || '', b.fir || '', b.gps || '', b.reporter || req.user.name, b.assigned || '',
      b.description || '', b.remarks || '', b.photo || '', JSON.stringify(timeline),
      now, '', '', '', req.user.id);
  addLog(`Incident ${caseId} reported — ${b.type || 'Other'} at ${b.station || 'unspecified station'}`);
  notify(`${b.priority || 'Medium'} priority: ${b.type || 'Other'} reported at ${b.station || 'station not noted'}`, (b.priority === 'Critical' || b.priority === 'High') ? 'critical' : 'info');
  audit(req, 'create', id);
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  res.status(201).json({ incident: rowToJson(row) });
});

// PATCH /api/incidents/:id  — edit fields (not stage)
router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Incident not found' });
  const b = req.body || {};
  const fields = ['type','priority','station','platform','train','coach','gd_entry','fir','gps','reporter','assigned','description','remarks','photo'];
  const map = { gdEntry:'gd_entry' };
  const updates = {};
  for (const key of Object.keys(b)) {
    const col = map[key] || key;
    if (fields.includes(col)) updates[col] = b[key];
  }
  if (Object.keys(updates).length) {
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE incidents SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }
  audit(req, 'update', req.params.id);
  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  res.json({ incident: rowToJson(updated) });
});

// POST /api/incidents/:id/advance  — move to next workflow stage
router.post('/:id/advance', (req, res) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Incident not found' });
  const idx = INCIDENT_STAGES.indexOf(row.status);
  const next = INCIDENT_STAGES[idx + 1];
  if (!next) return res.status(400).json({ error: 'Already at final stage' });

  const now = new Date().toISOString();
  const timeline = JSON.parse(row.timeline || '[]');
  timeline.push({ t: now, text: INCIDENT_LABELS[idx + 1] });

  let assigned = row.assigned, assignedAt = row.assigned_at, resolvedAt = row.resolved_at, closedAt = row.closed_at;
  if (next === 'assigned') { assigned = req.body.assigned || row.assigned || req.user.name; assignedAt = now; }
  if (next === 'resolved') resolvedAt = now;
  if (next === 'closed') closedAt = now;

  db.prepare('UPDATE incidents SET status=?, timeline=?, assigned=?, assigned_at=?, resolved_at=?, closed_at=? WHERE id=?')
    .run(next, JSON.stringify(timeline), assigned, assignedAt, resolvedAt, closedAt, req.params.id);

  addLog(`${row.case_id} at ${row.station || '—'} moved to ${next}`);
  if (next === 'closed') notify(`Case closed: ${row.type} at ${row.station || '—'}`, 'success');
  audit(req, `advance:${next}`, req.params.id);

  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  res.json({ incident: rowToJson(updated) });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Incident not found' });
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  audit(req, 'delete', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
