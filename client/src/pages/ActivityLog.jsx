import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils.js';

const empty = { type:'Patrolling', description:'', by:'' };

export default function ActivityLog() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, by: user?.name || '' });

  const load = () => api.get('/logs').then(res => setList(res.data.logs));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.description.trim()) { toast('Add a description', 'warn'); return; }
    try { await api.post('/logs', form); toast('Entry saved'); setModalOpen(false); setForm({ ...empty, by: user?.name || '' }); load(); }
    catch (e) { toast(e.response?.data?.error || 'Could not save', 'error'); }
  };

  return (
    <div>
      <h2 className="vtitle">Daily activity register</h2>
      <p className="vsub">Every action across the platform is logged here automatically, alongside manual entries.</p>
      <div className="toolbar"><div className="spacer"></div><button className="btn primary" onClick={() => setModalOpen(true)}>+ Add entry</button></div>

      {list.length === 0 && <div className="empty">No activity logged yet.</div>}
      {list.map(l => (
        <div className="row" key={l.id}>
          <div>
            <div className="row-main"><b>{l.type}</b> — {l.description}</div>
            <div className="row-sub">{l.by_name ? `By ${l.by_name} · ` : ''}{timeAgo(l.at)}</div>
          </div>
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add activity log entry">
        <div className="field"><label>Type</label><select value={form.type} onChange={set('type')}><option>Patrolling</option><option>Passenger Assistance</option><option>Lost Property</option><option>Security Incident</option><option>Other</option></select></div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
        <div className="field"><label>Logged by</label><input value={form.by} onChange={set('by')} /></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save entry</button>
        </div>
      </Modal>
    </div>
  );
}
