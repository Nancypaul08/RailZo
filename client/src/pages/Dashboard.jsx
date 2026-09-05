import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { timeAgo } from '../utils.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [criticalItems, setCriticalItems] = useState([]);
  const [riskOverview, setRiskOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [duties, setDuties] = useState([]);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr, setSummaryErr] = useState('');

  const load = () => {
    api.get('/dashboard/summary').then(res => { setKpis(res.data.kpis); setCriticalItems(res.data.criticalItems); setRiskOverview(res.data.riskOverview); });
    api.get('/logs').then(res => setLogs(res.data.logs.slice(0, 8)));
    api.get('/duties').then(res => setDuties(res.data.duties));
  };
  useEffect(() => { load(); }, []);

  const genSummary = async () => {
    setSummaryLoading(true); setSummaryErr('');
    try {
      const res = await api.post('/ai/summary');
      setSummary(res.data.summary);
    } catch (e) {
      setSummaryErr(e.response?.data?.error || 'Could not generate a summary right now.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const dutyCounts = duties.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});

  if (!kpis) return <p style={{ color: 'var(--text-soft)' }}>Loading dashboard…</p>;

  return (
    <div>
      <h2 className="vtitle">Today at a glance</h2>
      <p className="vsub">Live operational summary — computed server-side from incidents, missing persons, duty and patrol data.</p>

      <div className="kpi-grid">
        <div className="kpi red"><div className="kpi-num">{kpis.openInc + kpis.openMp}</div><div className="kpi-label">Open cases</div></div>
        <div className="kpi red"><div className="kpi-num">{kpis.critical}</div><div className="kpi-label">Critical cases</div></div>
        <div className="kpi amber"><div className="kpi-num">{kpis.searching}</div><div className="kpi-label">Under search</div></div>
        <div className="kpi green"><div className="kpi-num">{kpis.foundToday}</div><div className="kpi-label">Found today</div></div>
        <div className="kpi green"><div className="kpi-num">{kpis.closedToday}</div><div className="kpi-label">Closed today</div></div>
        <div className="kpi blue"><div className="kpi-num">{kpis.onDuty}</div><div className="kpi-label">Officers on duty</div></div>
        <div className="kpi"><div className="kpi-num">{kpis.avgResponseMin != null ? kpis.avgResponseMin + ' min' : '—'}</div><div className="kpi-label">Avg. response time</div></div>
        <div className="kpi"><div className="kpi-num">{kpis.recoveryRate != null ? kpis.recoveryRate + '%' : '—'}</div><div className="kpi-label">Recovery rate</div></div>
        <div className="kpi blue"><div className="kpi-num">{kpis.patrolsToday}</div><div className="kpi-label">Today's patrols</div></div>
        <div className="kpi amber"><div className="kpi-num">{kpis.incidentsToday}</div><div className="kpi-label">Today's incidents</div></div>
      </div>

      {riskOverview && <div className="risk-overview panel">
        <div className="risk-overview-head">
          <div>
            <div className="panel-head"><span className="panel-ic red">!</span>AI risk overview</div>
            <p className="risk-caption">Explainable signals from open operational cases. Recommendations remain subject to human approval.</p>
          </div>
          <div className="risk-approval"><b>{riskOverview.pendingApprovals}</b><span>pending approvals</span></div>
        </div>
        <div className="risk-counts">
          {['Critical', 'High', 'Medium', 'Low'].map(level => <div className={'risk-count ' + level.toLowerCase()} key={level}>
            <span>{level}</span><b>{riskOverview.counts[level] || 0}</b>
          </div>)}
        </div>
        <div className="risk-alerts">
          {riskOverview.alerts.slice(0, 4).map(alert => <div className="risk-alert" key={alert.id}>
            <div><b>{alert.caseId}</b><span>{alert.label}</span></div>
            <div className="risk-alert-score"><strong>{alert.score}</strong><small>{alert.level}</small></div>
          </div>)}
          {riskOverview.alerts.length === 0 && <div className="empty">No open risk signals detected.</div>}
        </div>
      </div>}

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><span className="panel-ic red">!</span>Critical alerts</div>
          {criticalItems.length === 0
            ? <div className="ok-row">✓ No critical cases open right now.</div>
            : criticalItems.map(c => (
              <div className="alert-row" key={c.id}>
                <span><b>{c.score}/100</b> {c.label} — {timeAgo(c.at)}</span>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 11.5, color: 'var(--red)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => navigate(`/incidents?q=${encodeURIComponent(c.caseId)}`)}>Open →</span>
              </div>
            ))}
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-ic">☰</span>Duty snapshot</div>
          {duties.length === 0
            ? <div className="empty">No duty entries for today yet.</div>
            : (
              <>
                <div className="row" style={{ background: 'none', border: 'none', padding: '6px 0' }}>
                  <span>Total on duty</span><b>{duties.length}</b>
                </div>
                {Object.entries(dutyCounts).map(([t, c]) => (
                  <div key={t} className="row" style={{ background: 'none', border: 'none', padding: '6px 0' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{t}</span><b>{c}</b>
                  </div>
                ))}
              </>
            )}
          <button className="btn secondary small" style={{ marginTop: 10 }} onClick={() => navigate('/duty')}>View full roster</button>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-ic">⏱</span>Recent activity</div>
          {logs.length === 0
            ? <div className="empty">No activity yet.</div>
            : logs.map(l => (
              <div className="feed-item" key={l.id}><time>{timeAgo(l.at)}</time><span>{l.type}: {l.description}</span></div>
            ))}
        </div>

        <div className="panel full">
          <div className="panel-head"><span className="panel-ic">✦</span>AI daily summary</div>
          {summaryErr && <p style={{ color: 'var(--red)', fontSize: 12.5 }}>{summaryErr}</p>}
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            {summary
              ? <p>{summary}</p>
              : <p style={{ color: 'var(--text-faint)' }}>Generate a short written brief of today's cases, patrols, duty coverage and log entries.</p>}
          </div>
          <button className="btn small" style={{ marginTop: 10 }} onClick={genSummary} disabled={summaryLoading}>
            {summaryLoading ? 'Generating…' : summary ? 'Regenerate summary' : 'Generate summary'}
          </button>
        </div>
      </div>
    </div>
  );
}
