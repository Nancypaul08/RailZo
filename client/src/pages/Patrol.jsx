import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const empty = { name:'', officer:'', area:'', shift:'', gps:'', status:'scheduled' };

export default function Patrol() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get('/patrols', { params: { status: filter } }).then(res => setList(res.data.patrols));
  useEffect(() => { load(); }, [filter]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { toast('Enter a patrol name', 'warn'); return; }
    try { await api.post('/patrols', form); toast('Patrol saved'); setModalOpen(false); setForm(empty); load(); }
    catch (e) { toast(e.response?.data?.error || 'Could not save', 'error'); }
  };
  const start = (id) => api.post(`/patrols/${id}/start`).then(load);
  const complete = (id) => api.post(`/patrols/${id}/complete`).then(load);

  return (
    <div>
      <h2 className="vtitle">Patrol management</h2>
      <p className="vsub">Scheduled and active patrols by area and shift.</p>
      <div className="toolbar">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option>
        </select>
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ New patrol</button>
      </div>

      {list.length === 0 && <div className="empty">No patrols logged yet.</div>}
      {list.map(p => (
        <div className="rec-card" key={p.id}>
          <div className="rec-top">
            <div>
              <div className="rec-name">{p.name}</div>
              <div className="rec-meta">{p.officer || 'unassigned'} · {p.area || 'area not noted'} · {p.shift || 'shift not noted'}{p.gps ? ` · GPS: ${p.gps}` : ''}</div>
            </div>
            <span className={'pill ' + (p.status === 'active' ? 'p-amber' : p.status === 'completed' ? 'p-green' : 'p-gray')}>{p.status.toUpperCase()}</span>
          </div>
          <div className="rec-actions">
            {p.status === 'scheduled' && <button className="btn small" onClick={() => start(p.id)}>Start patrol</button>}
            {p.status === 'active' && <button className="btn small" onClick={() => complete(p.id)}>Mark completed</button>}
          </div>
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New patrol">
        <div className="field"><label>Patrol name</label><input value={form.name} onChange={set('name')} placeholder="e.g. Platform 3-5 sweep" /></div>
        <div className="field-row">
          <div className="field"><label>Officer</label><input value={form.officer} onChange={set('officer')} /></div>
          <div className="field"><label>Area</label><input value={form.area} onChange={set('area')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Shift</label><input value={form.shift} onChange={set('shift')} placeholder="08:00–16:00" /></div>
          <div className="field"><label>GPS / beat</label><input value={form.gps} onChange={set('gps')} /></div>
        </div>
        <div className="field"><label>Status</label><select value={form.status} onChange={set('status')}><option value="scheduled">Scheduled</option><option value="active">Active</option></select></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save patrol</button>
        </div>
      </Modal>
    </div>
  );
}
