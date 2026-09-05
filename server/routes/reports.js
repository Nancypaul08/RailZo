const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  return headers.join(',') + '\n' + rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
}
function sendCsv(res, filename, rows) {
  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv || 'No data available yet');
}

router.get('/incidents.csv', (req, res) => {
  const rows = db.prepare('SELECT case_id as id, type, priority, status, station, platform, train, reporter, assigned, created_at FROM incidents ORDER BY created_at DESC').all();
  sendCsv(res, 'incidents.csv', rows);
});
router.get('/missing.csv', (req, res) => {
  const rows = db.prepare('SELECT case_id as id, name, age_gender, status, station, reporter, created_at, found_at FROM missing_persons ORDER BY created_at DESC').all();
  sendCsv(res, 'missing_persons.csv', rows);
});
router.get('/duties.csv', (req, res) => {
  const rows = db.prepare('SELECT name, type, post, shift, date FROM duties ORDER BY date DESC').all();
  sendCsv(res, 'duty_roster.csv', rows);
});
router.get('/logs.csv', (req, res) => {
  const rows = db.prepare('SELECT type, description, by_name as loggedBy, at FROM logs ORDER BY at DESC').all();
  sendCsv(res, 'activity_register.csv', rows);
});

module.exports = router;
