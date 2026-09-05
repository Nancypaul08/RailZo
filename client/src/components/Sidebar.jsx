import { NavLink } from 'react-router-dom';

const NAV = [
  { section: null, items: [{ to: '/', label: 'Dashboard', icon: '◧' }] },
  { section: 'Operations', items: [
    { to: '/incidents', label: 'Incidents', icon: '▲' },
    { to: '/missing', label: 'Missing persons', icon: '◎' },
    { to: '/patrol', label: 'Patrol', icon: '⛯' },
    { to: '/duty', label: 'Duty roster', icon: '☰' },
    { to: '/lostfound', label: 'Lost & found', icon: '◇' },
  ]},
  { section: 'People', items: [
    { to: '/officers', label: 'Officers', icon: '◈' },
    { to: '/log', label: 'Activity register', icon: '≡' },
  ]},
  { section: 'Insight', items: [
    { to: '/analytics', label: 'Analytics', icon: '◫' },
    { to: '/ai', label: 'AI assistant', icon: '✦' },
    { to: '/reports', label: 'Reports', icon: '▤' },
  ]},
  { section: 'System', items: [
    { to: '/settings', label: 'Settings', icon: '⚙' },
  ]},
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sb-brand"><span className="sb-dot"></span><b>Railzo</b></div>
      <div className="sb-tag">AI-powered RPF operations</div>
      <div className="sb-nav">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.section && <div className="sb-section">{group.section}</div>}
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
                <span className="ic">{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="sb-foot">Railzo v3.0 · MERN build<br/>RPF internal use only</div>
    </aside>
  );
}
