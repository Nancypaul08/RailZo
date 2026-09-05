const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();
const ROLES = ['Admin', 'Inspector', 'Sub Inspector', 'Constable', 'Control Room Operator', 'Supervisor'];

function toPublicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, badge: row.badge, station: row.station, photo: row.photo, role: row.role };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, badge: user.badge, role: user.role, station: user.station },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, badge, password, station, role, photo } = req.body || {};
  if (!name || !badge || !password) {
    return res.status(400).json({ error: 'name, badge, and password are required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  const finalRole = ROLES.includes(role) ? role : 'Constable';
  const existing = db.prepare('SELECT id FROM users WHERE badge = ?').get(badge);
  if (existing) return res.status(409).json({ error: 'An account with this badge number already exists' });

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, name, badge, station, photo, role, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, name, badge, station || '', photo || '', finalRole, hash, new Date().toISOString());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  db.prepare(`INSERT INTO audit_log (id, user_id, user_name, action, resource, resource_id, at, ip) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), id, name, 'register', 'user', id, new Date().toISOString(), req.ip);
  res.status(201).json({ token, user: toPublicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { badge, password } = req.body || {};
  if (!badge || !password) return res.status(400).json({ error: 'badge and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE badge = ?').get(badge);
  if (!user) return res.status(401).json({ error: 'Invalid badge number or password' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid badge number or password' });
  const token = signToken(user);
  db.prepare(`INSERT INTO audit_log (id, user_id, user_name, action, resource, resource_id, at, ip) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), user.id, user.name, 'login', 'user', user.id, new Date().toISOString(), req.ip);
  res.json({ token, user: toPublicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
});

// PATCH /api/auth/me — update own profile (name, station, photo)
router.patch('/me', requireAuth, (req, res) => {
  const { name, station, photo } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET name = ?, station = ?, photo = ? WHERE id = ?')
    .run(name ?? user.name, station ?? user.station, photo ?? user.photo, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: toPublicUser(updated) });
});

router.get('/roles', (req, res) => res.json({ roles: ROLES }));

module.exports = router;
