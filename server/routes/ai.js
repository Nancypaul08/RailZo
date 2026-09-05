const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { scoreCase } = require('../risk');

const router = express.Router();
router.use(requireAuth);
const todayStr = () => new Date().toISOString().slice(0, 10);

function buildContext() {
  const incidents = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC LIMIT 40').all()
    .map(c => {
      const risk = scoreCase(c, 'incident');
      return { id: c.case_id, type: c.type, priority: c.priority, status: c.status, station: c.station, description: c.description, riskScore: risk.score, riskLevel: risk.level, riskFactors: risk.factors, recommendation: risk.recommendation };
    });
  const missing = db.prepare('SELECT * FROM missing_persons ORDER BY created_at DESC LIMIT 40').all()
    .map(c => {
      const risk = scoreCase(c, 'missing');
      return { id: c.case_id, name: c.name, ageGender: c.age_gender, status: c.status, station: c.station, riskScore: risk.score, riskLevel: risk.level, riskFactors: risk.factors, recommendation: risk.recommendation };
    });
  const today = todayStr();
  const duties = db.prepare('SELECT * FROM duties WHERE date = ?').all(today)
    .map(d => ({ name: d.name, type: d.type, post: d.post }));
  const patrols = db.prepare('SELECT * FROM patrols WHERE date = ?').all(today)
    .map(p => ({ name: p.name, area: p.area, status: p.status }));
  const logs = db.prepare('SELECT * FROM logs ORDER BY at DESC LIMIT 30').all()
    .filter(l => l.at.slice(0, 10) === today)
    .map(l => ({ type: l.type, desc: l.description }));
  return { date: today, incidents, missingPersons: missing, duties, patrols, logsToday: logs };
}

router.post('/ask', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'AI assistant is not configured. Set ANTHROPIC_API_KEY in the server .env file to enable it.' });
  }
  const question = (req.body && req.body.question) || '';
  if (!question.trim()) return res.status(400).json({ error: 'question is required' });

  try {
    const context = buildContext();
    const prompt = `You are an assistant embedded in Railzo, an RPF (Railway Protection Force) operations platform. Here is today's data as JSON:\n${JSON.stringify(context)}\n\nAnswer this request from an officer, using only this data (say clearly if something isn't in the data rather than inventing it). Each case includes an explainable risk score, level, contributing factors, and a recommendation from the server-side risk engine. Treat those as operational signals, not proof of wrongdoing. Clearly label FACT, RISK EXPLANATION, and RECOMMENDATION when relevant. Never make a final policing decision, accuse a person, or claim that recovery is guaranteed. High-risk actions require human approval. Request: "${question}"\n\nIf asked to generate an FIR draft, format it as a plain-text official-style draft with clear sections, but note in one line it is a draft to be reviewed by a competent authority before filing. Keep the answer under 220 words unless a report was explicitly requested.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) {
      const errBody = await response.text();
      return res.status(502).json({ error: 'AI provider error', detail: errBody });
    }
    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join(' ').trim();
    res.json({ answer: text || "I couldn't generate a response just now." });
  } catch (e) {
    res.status(502).json({ error: 'AI assistant is unavailable right now', detail: e.message });
  }
});

router.post('/summary', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'AI assistant is not configured. Set ANTHROPIC_API_KEY in the server .env file to enable it.' });
  }
  try {
    const context = buildContext();
    const prompt = `Write a short internal duty-desk summary for RPF staff based on this JSON of today's data:\n${JSON.stringify(context)}\n\n3-5 plain sentences, professional tone, no markdown, mentioning open/critical cases, anything found today, duty and patrol coverage, and notable log entries.`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) {
      const errBody = await response.text();
      return res.status(502).json({ error: 'AI provider error', detail: errBody });
    }
    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join(' ').trim();
    res.json({ summary: text || 'Could not generate a summary just now.' });
  } catch (e) {
    res.status(502).json({ error: 'AI assistant is unavailable right now', detail: e.message });
  }
});

module.exports = router;
