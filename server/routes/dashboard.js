const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { scoreCase } = require('../risk');

const router = express.Router();
router.use(requireAuth);
const todayStr = () => new Date().toISOString().slice(0, 10);

router.get('/summary', (req, res) => {
  const incidents = db.prepare('SELECT * FROM incidents').all();
  const missing = db.prepare('SELECT * FROM missing_persons').all();
  const duties = db.prepare('SELECT * FROM duties').all();
  const patrols = db.prepare('SELECT * FROM patrols').all();
  const today = todayStr();

  const openInc = incidents.filter(c => c.status !== 'closed').length;
  const openMp = missing.filter(c => c.status !== 'closed').length;
  const critical = incidents.filter(c => c.priority === 'Critical' && c.status !== 'closed').length +
    missing.filter(c => c.priority === 'Critical' && c.status !== 'closed').length;
  const searching = incidents.filter(c => c.status === 'searching').length + missing.filter(c => c.status === 'searching').length;
  const foundToday = missing.filter(c => c.found_at && c.found_at.slice(0, 10) === today).length;

  const closedToday = [...incidents, ...missing].filter(c => {
    const tl = JSON.parse(c.timeline || '[]');
    return c.status === 'closed' && tl.some(t => t.text === 'Closed' && t.t.slice(0, 10) === today);
  }).length;

  const onDuty = duties.filter(d => d.date === today).length;
  const patrolsToday = patrols.filter(p => p.date === today).length;
  const incidentsToday = [...incidents, ...missing].filter(c => (c.created_at || '').slice(0, 10) === today).length;

  const closedMp = missing.filter(c => ['found', 'guardianverified', 'handedover', 'closed'].includes(c.status)).length;
  const recoveryRate = missing.length ? Math.round((closedMp / missing.length) * 100) : null;

  const respTimes = [];
  [...incidents, ...missing].forEach(c => {
    const tl = JSON.parse(c.timeline || '[]');
    const rep = tl.find(t => t.text === 'Reported');
    const asn = tl.find(t => t.text === 'Assigned');
    if (rep && asn) respTimes.push((new Date(asn.t) - new Date(rep.t)) / 60000);
  });
  const avgResponseMin = respTimes.length ? Math.round(respTimes.reduce((a, b) => a + b, 0) / respTimes.length) : null;

  const criticalItems = [
    ...incidents.filter(c => c.status !== 'closed').map(c => ({ ...scoreCase(c, 'incident'), id: c.id, caseId: c.case_id, label: c.type, at: c.created_at })),
    ...missing.filter(c => c.status !== 'closed').map(c => ({ ...scoreCase(c, 'missing'), id: c.id, caseId: c.case_id, label: 'Missing: ' + c.name, at: c.created_at }))
  ];
  const riskAlerts = criticalItems.sort((a, b) => b.score - a.score).slice(0, 8);
  const riskCounts = riskAlerts.reduce((acc, item) => { acc[item.level] = (acc[item.level] || 0) + 1; return acc; }, { Critical: 0, High: 0, Medium: 0, Low: 0 });
  const pendingApprovals = riskAlerts.filter(item => item.approvalStatus === 'Pending').length;

  res.json({
    kpis: { openInc, openMp, critical: riskCounts.Critical, searching, foundToday, closedToday, onDuty, patrolsToday, incidentsToday, recoveryRate, avgResponseMin },
    criticalItems: riskAlerts.filter(item => item.level === 'Critical'),
    riskOverview: { counts: riskCounts, pendingApprovals, alerts: riskAlerts }
  });
});

module.exports = router;
