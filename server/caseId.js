const db = require('./db/db');

db.exec(`CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)`);

function nextCaseId(prefix = 'TRK') {
  const row = db.prepare('SELECT value FROM counters WHERE name = ?').get('case_counter');
  const next = (row ? row.value : 0) + 1;
  if (row) {
    db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(next, 'case_counter');
  } else {
    db.prepare('INSERT INTO counters (name, value) VALUES (?, ?)').run('case_counter', next);
  }
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(next).padStart(5, '0')}`;
}

module.exports = { nextCaseId };
