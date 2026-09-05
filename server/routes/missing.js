const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { nextCaseId } = require('../caseId');
const { MISSING_STAGES, MISSING_LABELS } = require('../constants');
const { scoreCase } = require('../risk');

const router = express.Router();
router.use(requireAuth);

function rowToJson(r) {
  const risk = scoreCase(r, 'missing');
  return { ...r, ...risk, riskFactors: risk.factors, photos: JSON.parse(r.photos || '[]'), timeline: JSON.parse(r.timeline || '[]') };
}
function audit(req, action, resourceId) {
  db.prepare(`INSERT INTO audit_log (id, user_id, user_name, action, resource, resource_id, at, ip) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), req.user.id, req.user.name, action, 'missing_person', resourceId, new Date().toISOString(), req.ip);
}
function addLog(text) {
  db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
    .run(uuid(), 'Auto', text, 'System', new Date().toISOString());
}
function notify(text, category) {
  db.prepare('INSERT INTO notifications (id, text, category, read, at) VALUES (?,?,?,0,?)')
    .run(uuid(), text, category || 'info', new Date().toISOString());
}

router.get('/', (req, res) => {
  const { status, q } = req.query;
  let rows = db.prepare('SELECT * FROM missing_persons ORDER BY created_at DESC').all();
  if (status && status !== 'all') rows = rows.filter(r => r.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(r => `${r.name} ${r.station} ${r.case_id} ${r.guardian_name || ''} ${r.fir || ''}`.toLowerCase().includes(needle));
  }
  res.json({ missingPersons: rows.map(rowToJson) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Case not found' });
  res.json({ missingPerson: rowToJson(row) });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Name is required' });
  const id = uuid();
  const caseId = nextCaseId('TRK');
  const now = new Date().toISOString();
  const timeline = [{ t: now, text: 'Reported' }];
  const ageMatch = (b.ageGender || '').match(/\d+/);
  const age = ageMatch ? parseInt(ageMatch[0], 10) : null;
  const priority = b.priority || (age !== null && age < 10 ? 'Critical' : 'High');
  db.prepare(`INSERT INTO missing_persons
    (id, case_id, name, photos, age_gender, priority, guardian_name, guardian_phone, address, clothing, marks, station, platform, train, coach, gd_entry, fir, reporter, assigned, remarks, status, timeline, created_at, found_at, closed_by, handed_over_at, closed_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, caseId, b.name, JSON.stringify(b.photos || []), b.ageGender || '', priority,
      b.guardianName || '', b.guardianPhone || '', b.address || '', b.clothing || '', b.marks || '',
      b.station || '', b.platform || '', b.train || '', b.coach || '', b.gdEntry || '', b.fir || '',
      b.reporter || req.user.name, '', b.remarks || '', 'reported', JSON.stringify(timeline),
      now, '', '', '', '', req.user.id);
  addLog(`Missing person ${caseId} reported — ${b.name} last seen at ${b.station || 'unspecified station'}`);
  notify(`Missing person reported: ${b.name}`, 'critical');
  audit(req, 'create', id);
  const row = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(id);
  res.status(201).json({ missingPerson: rowToJson(row) });
});

router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Case not found' });
  const b = req.body || {};
  const map = { ageGender:'age_gender', guardianName:'guardian_name', guardianPhone:'guardian_phone', gdEntry:'gd_entry' };
  const fields = ['name','photos','age_gender','priority','guardian_name','guardian_phone','address','clothing','marks','station','platform','train','coach','gd_entry','fir','reporter','remarks'];
  const updates = {};
  for (const key of Object.keys(b)) {
    const col = map[key] || key;
    if (fields.includes(col)) updates[col] = col === 'photos' ? JSON.stringify(b[key]) : b[key];
  }
  if (Object.keys(updates).length) {
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE missing_persons SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }
  audit(req, 'update', req.params.id);
  const updated = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  res.json({ missingPerson: rowToJson(updated) });
});

// POST /api/missing/:id/advance  { assigned?, foundBy? }
router.post('/:id/advance', (req, res) => {
  const row = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Case not found' });
  const idx = MISSING_STAGES.indexOf(row.status);
  const next = MISSING_STAGES[idx + 1];
  if (!next) return res.status(400).json({ error: 'Already at final stage' });

  const now = new Date().toISOString();
  const timeline = JSON.parse(row.timeline || '[]');
  timeline.push({ t: now, text: MISSING_LABELS[idx + 1] });

  let assigned = row.assigned, foundAt = row.found_at, closedBy = row.closed_by, handedOverAt = row.handed_over_at, closedAt = row.closed_at;
  if (next === 'assigned') assigned = req.body.assigned || req.user.name;
  if (next === 'found') { closedBy = req.body.foundBy || req.user.name; foundAt = now; }
  if (next === 'handedover') handedOverAt = now;
  if (next === 'closed') closedAt = now;

  db.prepare('UPDATE missing_persons SET status=?, timeline=?, assigned=?, found_at=?, closed_by=?, handed_over_at=?, closed_at=? WHERE id=?')
    .run(next, JSON.stringify(timeline), assigned, foundAt, closedBy, handedOverAt, closedAt, req.params.id);

  addLog(`${row.case_id} (${row.name}) moved to ${next}`);
  if (next === 'found') notify(`${row.name} marked found`, 'success');
  if (next === 'closed') notify(`${row.name} case closed`, 'success');
  audit(req, `advance:${next}`, req.params.id);

  const updated = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  res.json({ missingPerson: rowToJson(updated) });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM missing_persons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Case not found' });
  db.prepare('DELETE FROM missing_persons WHERE id = ?').run(req.params.id);
  audit(req, 'delete', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
