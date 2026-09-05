import { useEffect, useState } from 'react';
import api from '../api';

export default function StatusBar() {
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const check = () => {
      api.get('/health').then(() => { setOnline(true); setLastSync(new Date()); }).catch(() => setOnline(false));
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="statusbar">
      <span className={'status-dot' + (online ? '' : ' off')}></span>
      <span>{online ? 'API connected' : 'API unreachable'}</span>
      <span className="status-sep">·</span>
      <span>Last sync: <b>{lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>
      <span className="status-sep">·</span>
      <span>Railzo v3.0</span>
    </div>
  );
}
