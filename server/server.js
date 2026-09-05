require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

require('./db/db'); // ensures tables exist

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '15mb' })); // generous limit for base64 photo uploads
app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/missing', require('./routes/missing'));
app.use('/api/patrols', require('./routes/patrols'));
app.use('/api/duties', require('./routes/duties'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/officers', require('./routes/officers'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'railzo-api', time: new Date().toISOString() }));

// Serve the built React frontend in production, if present
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), err => { if (err) next(); });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Railzo API listening on http://localhost:${PORT}`);
});
