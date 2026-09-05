import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import StationInput from '../components/StationInput.jsx';

const empty = { name:'', rank:'', badge:'', station:'', phone:'', email:'', availability:'On duty' };

export default function Officers() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get('/officers', { params: { q } }).then(res => setList(res.data.officers));
  useEffect(() => { load(); }, [q]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { toast('Enter a name', 'warn'); return; }
    try { await api.post('/officers', form); toast('Officer added'); setModalOpen(false); setForm(empty); load(); }
    catch (e) { toast(e.response?.data?.error || 'Could not save', 'error'); }
  };

  const badgeColor = { 'On duty': 'p-green', 'Off duty': 'p-gray', 'On leave': 'p-amber' };

  return (
    <div>
      <h2 className="vtitle">Officer directory</h2>
      <p className="vsub">Roster of officers, rank, contact details and current availability.</p>
      <div className="toolbar">
        <input type="text" placeholder="Search officers..." value={q} onChange={e => setQ(e.target.value)} />
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ Add officer</button>
      </div>

      {list.length === 0 && <div className="empty">No officers added yet.</div>}
      {list.map(o => (
        <div className="row" key={o.id}>
          <div>
            <div className="row-main"><b>{o.name}</b>{o.rank ? ` — ${o.rank}` : ''}{o.badge ? ` · #${o.badge}` : ''}</div>
            <div className="row-sub">{o.station || 'station not noted'}{o.phone ? ` · ${o.phone}` : ''}{o.email ? ` · ${o.email}` : ''}</div>
          </div>
          <span className={'pill ' + (badgeColor[o.availability] || 'p-gray')}>{o.availability}</span>
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add officer">
        <div className="field-row">
          <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} /></div>
          <div className="field"><label>Rank</label><input value={form.rank} onChange={set('rank')} placeholder="e.g. Sub Inspector" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Badge number</label><input value={form.badge} onChange={set('badge')} /></div>
          <div className="field"><label>Station</label><StationInput value={form.station} onChange={value => setForm(f => ({ ...f, station: value }))} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={set('email')} /></div>
        </div>
        <div className="field"><label>Availability</label><select value={form.availability} onChange={set('availability')}><option>On duty</option><option>Off duty</option><option>On leave</option></select></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save officer</button>
        </div>
      </Modal>
    </div>
  );
}
