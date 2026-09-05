import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { initials, timeAgo } from '../utils.js';

export default function Topbar() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const loadNotifs = () => {
    api.get('/notifications').then(res => setNotifs(res.data.notifications)).catch(() => {});
  };
  useEffect(() => { loadNotifs(); const t = setInterval(loadNotifs, 20000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const onSearch = (e) => {
    if (e.key === 'Enter' && q.trim()) navigate(`/incidents?q=${encodeURIComponent(q.trim())}`);
  };

  const openNotifs = () => {
    setOpen(o => !o);
    if (!open) api.post('/notifications/read-all').then(loadNotifs).catch(() => {});
  };

  return (
    <div className="topbar">
      <div className="tsearch">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input placeholder="Search incidents, cases, stations..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={onSearch} />
      </div>
      <div className="top-spacer"></div>
      <div style={{ position: 'relative' }} ref={boxRef}>
        <button className="ticon" onClick={openNotifs} title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
          {unread > 0 && <span className="tbadge">{unread}</span>}
        </button>
        {open && (
          <div className="dropdown">
            <div className="dd-head">Notifications</div>
            {notifs.length === 0 && <div className="dd-empty">No notifications yet.</div>}
            {notifs.slice(0, 15).map(n => (
              <div className="dd-item" key={n.id}>{n.text}<div className="dd-time">{timeAgo(n.at)}</div></div>
            ))}
          </div>
        )}
      </div>
      <button className="ticon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">◐</button>
      <span className="trole">{user?.role}</span>
      <button className="tchip" onClick={() => navigate('/settings')}>
        <span className="tchip-av">{user?.photo ? <img src={user.photo} alt="" /> : initials(user?.name)}</span>
        <span>{user?.name || 'Set your name'}</span>
      </button>
    </div>
  );
}
