const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, name, badge, role, station }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Roles allowed to perform a write/delete on a given route.
// Admin and Supervisor always pass; others are checked against the allow-list.
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'Admin' || req.user.role === 'Supervisor') return next();
    if (allowed.includes(req.user.role)) return next();
    return res.status(403).json({ error: `Role '${req.user.role}' is not permitted to perform this action` });
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
