import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#D9A544', '#5B9FEF', '#33C481', '#F0555B', '#C9B37C', '#9F7AEA', '#EC8FA3', '#7C8FA6'];

export default function Analytics() {
  const [incidents, setIncidents] = useState([]);
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    api.get('/incidents').then(res => setIncidents(res.data.incidents));
    api.get('/missing').then(res => setMissing(res.data.missingPersons));
  }, []);

  const all = [...incidents, ...missing.map(m => ({ ...m, type: 'Missing Person' }))];

  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const perDay = days.map(d => ({ day: d.slice(5), cases: all.filter(c => (c.created_at || '').slice(0, 10) === d).length }));

  const stationCounts = {};
  all.forEach(c => { const s = c.station || 'Unspecified'; stationCounts[s] = (stationCounts[s] || 0) + 1; });
  const stationData = Object.entries(stationCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([station, cases]) => ({ station, cases }));

  const typeCounts = {};
  all.forEach(c => { typeCounts[c.type] = (typeCounts[c.type] || 0) + 1; });
  const typeData = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  const respByPriority = ['Critical', 'High', 'Medium', 'Low'].map(p => {
    const times = [];
    all.filter(c => c.priority === p).forEach(c => {
      const tl = Array.isArray(c.timeline) ? c.timeline : [];
      const rep = tl.find(t => t.text === 'Reported');
      const asn = tl.find(t => t.text === 'Assigned');
      if (rep && asn) times.push((new Date(asn.t) - new Date(rep.t)) / 60000);
    });
    return { priority: p, minutes: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0 };
  });

  const axisColor = 'var(--text-soft)';

  return (
    <div>
      <h2 className="vtitle">Analytics</h2>
      <p className="vsub">Trends across cases, stations, response time and officer workload.</p>
      <div className="chart-grid">
        <div className="panel">
          <div className="panel-head">Cases per day (7d)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={perDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="cases" stroke="#D9A544" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">Cases by station</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stationData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke={axisColor} fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="station" stroke={axisColor} fontSize={11} width={110} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="cases" fill="#D9A544" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">Cases by type</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10, fill: 'var(--text-soft)' }}>
                {typeData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">Response time by priority (min)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={respByPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="priority" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="minutes" fill="#5B9FEF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
