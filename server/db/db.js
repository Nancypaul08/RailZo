const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'trackline.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge TEXT UNIQUE NOT NULL,
  station TEXT,
  photo TEXT,
  role TEXT NOT NULL DEFAULT 'Constable',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  case_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reported',
  station TEXT, platform TEXT, train TEXT, coach TEXT,
  gd_entry TEXT, fir TEXT, gps TEXT,
  reporter TEXT, assigned TEXT,
  description TEXT, remarks TEXT, photo TEXT,
  timeline TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  assigned_at TEXT, resolved_at TEXT, closed_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS missing_persons (
  id TEXT PRIMARY KEY,
  case_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  age_gender TEXT,
  priority TEXT NOT NULL DEFAULT 'High',
  guardian_name TEXT, guardian_phone TEXT,
  address TEXT, clothing TEXT, marks TEXT,
  station TEXT, platform TEXT, train TEXT, coach TEXT,
  gd_entry TEXT, fir TEXT,
  reporter TEXT, assigned TEXT, remarks TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  timeline TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  found_at TEXT, closed_by TEXT, handed_over_at TEXT, closed_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS patrols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  officer TEXT, area TEXT, shift TEXT, gps TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  date TEXT NOT NULL,
  started_at TEXT, completed_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS duties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, rank TEXT, badge TEXT, supervisor TEXT,
  type TEXT NOT NULL, label TEXT,
  post TEXT, shift TEXT, attendance TEXT DEFAULT 'Present',
  date TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS lostfound (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, description TEXT,
  location TEXT, found_by TEXT,
  status TEXT NOT NULL DEFAULT 'collected',
  claimant_name TEXT, claimant_phone TEXT,
  created_at TEXT NOT NULL, returned_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS officers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, rank TEXT, badge TEXT,
  station TEXT, phone TEXT, email TEXT,
  availability TEXT DEFAULT 'On duty',
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, description TEXT,
  by_name TEXT, at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL, category TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0, at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT, user_name TEXT, action TEXT NOT NULL,
  resource TEXT, resource_id TEXT, at TEXT NOT NULL, ip TEXT
);
`);

const addColumn = (table, column, definition) => {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(item => item.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};
['risk_score INTEGER DEFAULT 0', 'risk_level TEXT DEFAULT \'Low\'', 'risk_factors TEXT DEFAULT \'[]\'', 'risk_explanation TEXT DEFAULT \'\'', 'ai_recommendation TEXT DEFAULT \'\'', 'approval_status TEXT DEFAULT \'Not required\'']
  .forEach(definition => addColumn('incidents', definition.split(' ')[0], definition.slice(definition.indexOf(' ') + 1)));
['risk_score INTEGER DEFAULT 0', 'risk_level TEXT DEFAULT \'Low\'', 'risk_factors TEXT DEFAULT \'[]\'', 'risk_explanation TEXT DEFAULT \'\'', 'ai_recommendation TEXT DEFAULT \'\'', 'approval_status TEXT DEFAULT \'Not required\'']
  .forEach(definition => addColumn('missing_persons', definition.split(' ')[0], definition.slice(definition.indexOf(' ') + 1)));

module.exports = db;
