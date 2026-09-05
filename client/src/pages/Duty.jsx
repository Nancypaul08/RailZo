import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const DUTY_TYPES = ['Station duty','Train escort / scouting','Train checking','Patrolling','Anti-human trafficking (AHT) check','Ticket / passenger assistance','VIP / security bandobast','Other'];
const empty = { name:'', rank:'', badge:'', supervisor:'', type:'Station duty', label:'', post:'', shift:'', attendance:'Present' };

export default function Duty() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get('/duties', { params: { type: filterType } }).then(res => setList(res.data.duties));
  useEffect(() => { load(); }, [filterType]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { toast('Enter a staff name', 'warn'); return; }
    try {
      await api.post('/duties', form);
      toast('Duty entry saved');
      setModalOpen(false);
      setForm(empty);
      load();
    } catch (e) { toast(e.response?.data?.error || 'Could not save', 'error'); }
  };

  const groups = {};
  list.forEach(d => { const t = d.type || 'Other'; (groups[t] = groups[t] || []).push(d); });

  return (
    <div>
      <h2 className="vtitle">Duty roster — today</h2>
      <p className="vsub">Who is posted where, on what kind of duty, and for how long.</p>
      <div className="toolbar">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All duty types</option>
          {DUTY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ Add duty entry</button>
      </div>

      {list.length === 0 && <div className="empty">No duty entries for today yet.</div>}
      {DUTY_TYPES.filter(t => groups[t]).map(t => (
        <div key={t}>
          <div className="group-title">{t}<span className="group-count">{groups[t].length}</span></div>
          {groups[t].map(d => (
            <div className="row" key={d.id}>
              <div>
                <div className="row-main"><b>{d.name}</b>{d.rank ? ` · ${d.rank}` : ''}{d.badge ? ` · #${d.badge}` : ''} — {d.post || 'post not specified'}</div>
                <div className="row-sub">{d.type === 'Other' && d.label ? `Duty: ${d.label} · ` : ''}{d.shift || 'shift not specified'}{d.supervisor ? ` · Supervisor: ${d.supervisor}` : ''}</div>
              </div>
              <span className="pill p-green">{d.attendance}</span>
            </div>
          ))}
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add duty entry">
        <div className="field"><label>Staff name</label><input value={form.name} onChange={set('name')} /></div>
        <div className="field-row">
          <div className="field"><label>Rank</label><input value={form.rank} onChange={set('rank')} /></div>
          <div className="field"><label>Badge number</label><input value={form.badge} onChange={set('badge')} /></div>
        </div>
        <div className="field"><label>Duty type</label>
          <select value={form.type} onChange={set('type')}>{DUTY_TYPES.map(t => <option key={t}>{t}</option>)}</select>
        </div>
        {form.type === 'Other' && <div className="field"><label>Specify duty</label><input value={form.label} onChange={set('label')} /></div>}
        <div className="field-row">
          <div className="field"><label>Post / location</label><input value={form.post} onChange={set('post')} /></div>
          <div className="field"><label>Shift</label><input value={form.shift} onChange={set('shift')} placeholder="08:00–16:00" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Supervisor</label><input value={form.supervisor} onChange={set('supervisor')} /></div>
          <div className="field"><label>Attendance</label>
            <select value={form.attendance} onChange={set('attendance')}><option>Present</option><option>Leave</option><option>Absent</option></select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
