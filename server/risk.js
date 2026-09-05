const PRIORITY_POINTS = { Low: 5, Medium: 15, High: 25, Critical: 35 };
const CRITICAL_TYPES = new Set(['Suspicious Bag', 'Fire', 'Medical Emergency', 'Fight', 'Drug Smuggling', 'Women Safety', 'Child Rescue']);

function ageFrom(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function scoreCase(row, kind) {
  const factors = [];
  const add = (label, points) => factors.push({ label, points });
  const age = kind === 'missing' ? ageFrom(row.age_gender) : null;
  const elapsedHours = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 3600000);

  add(`${row.priority || 'Medium'} priority`, PRIORITY_POINTS[row.priority] || 15);
  if (kind === 'missing' && age !== null && age < 10) add('Subject is under 10', 25);
  if (kind === 'missing' && !['guardianverified', 'handedover', 'closed'].includes(row.status)) add('Guardian verification pending', 13);
  if (kind === 'missing' && !row.assigned) add('No officer assigned', 10);
  if (kind === 'incident' && CRITICAL_TYPES.has(row.type)) add(`${row.type} requires heightened response`, 18);
  if (!row.station || !row.platform) add('Location details incomplete', 8);
  if (!row.assigned) add('Case remains unassigned', 10);
  if (elapsedHours >= 2 && row.status !== 'closed') add(`Open for ${Math.floor(elapsedHours)} hours`, Math.min(18, Math.floor(elapsedHours * 3)));
  if (row.status === 'searching') add('Active search is still unresolved', 12);
  if (kind === 'incident' && !row.gd_entry && ['Critical', 'High'].includes(row.priority)) add('GD entry not recorded', 8);

  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const level = score >= 81 ? 'Critical' : score >= 61 ? 'High' : score >= 31 ? 'Medium' : 'Low';
  const recommendation = level === 'Critical'
    ? 'Escalate to Inspector, notify control room, and assign additional officer.'
    : level === 'High'
      ? 'Supervisor review recommended; verify missing information and response ownership.'
      : 'Continue routine monitoring and update the case timeline.';

  return {
    score,
    level,
    factors: factors.sort((a, b) => b.points - a.points).slice(0, 5),
    explanation: `Risk is ${level.toLowerCase()} because ${factors.slice(0, 3).map(f => f.label.toLowerCase()).join(', ')}.`,
    recommendation,
    approvalStatus: level === 'Critical' || level === 'High' ? 'Pending' : 'Not required'
  };
}

module.exports = { scoreCase };