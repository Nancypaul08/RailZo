import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo, compressImage } from '../utils.js';
import StationInput from '../components/StationInput.jsx';

const TYPES = ['Theft','Lost Property','Medical Emergency','Passenger Assistance','Fight','Suspicious Bag','Trespassing','Women Safety','Child Rescue','Drug Smuggling','Platform Dispute','Fire','Other'];
const STAGES = ['reported','assigned','searching','resolved','closed'];
const LABELS = ['Reported','Assigned','Searching','Resolved','Closed'];
const NEXT_LABEL = { reported: 'Assign', assigned: 'Start search', searching: 'Mark resolved', resolved: 'Close case' };

const empty = { type: 'Theft', priority: 'Medium', station: '', platform: '', train: '', coach: '', gdEntry: '', fir: '', gps: '', reporter: '', assigned: '', description: '', remarks: '', photo: '' };

function Track({ status }) {
  const idx = STAGES.indexOf(status);
  return (
    <div className="track">
      {STAGES.map((s, i) => (
        <div key={s} style={{ display: 'contents' }}>
          {i > 0 && <div className={'seg' + (i <= idx ? ' done' : '')}></div>}
          <div className="stop-wrap"><div className={'stop' + (i <= idx ? ' on' : '')}></div><div className="stop-label">{LABELS[i]}</div></div>
        </div>
      ))}
    </div>
  );
}

export default function Incidents() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [list, setList] = useState([]);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState(params.get('q') || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, reporter: user?.name || '' });
  const [assignFor, setAssignFor] = useState(null);
  const [assignName, setAssignName] = useState('');

  const load = () => {
    api.get('/incidents', { params: { type, status, q } }).then(res => setList(res.data.incidents));
  };
  useEffect(() => { load(); }, [type, status, q]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { const compressed = await compressImage(file); setForm(f => ({ ...f, photo: compressed })); }
    catch { toast('Could not process photo', 'warn'); }
  };

  const save = async () => {
    if (!form.description.trim() && !form.station.trim()) { toast('Add at least a station or description', 'warn'); return; }
    try {
      await api.post('/incidents', form);
      toast('Incident saved');
      setModalOpen(false);
      setForm({ ...empty, reporter: user?.name || '' });
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Could not save incident', 'error');
    }
  };

  const advance = async (item) => {
    const next = STAGES[STAGES.indexOf(item.status) + 1];
    if (next === 'assigned') { setAssignFor(item); setAssignName(item.assigned || ''); return; }
    try { await api.post(`/incidents/${item.id}/advance`, {}); load(); }
    catch (e) { toast(e.response?.data?.error || 'Could not update stage', 'error'); }
  };

  const confirmAssign = async () => {
    try {
      await api.post(`/incidents/${assignFor.id}/advance`, { assigned: assignName || user?.name });
      setAssignFor(null);
      load();
    } catch (e) { toast(e.response?.data?.error || 'Could not assign', 'error'); }
  };

  return (
    <div>
      <h2 className="vtitle">Incident management</h2>
      <p className="vsub">All incident types beyond missing persons — theft, medical, security, and more — on one workflow.</p>

      <div className="toolbar">
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="all">All types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STAGES.map((s, i) => <option key={s} value={s}>{LABELS[i]}</option>)}
        </select>
        <input type="text" placeholder="Search incidents..." value={q} onChange={e => setQ(e.target.value)} />
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ New incident</button>
      </div>

      {list.length === 0 && <div className="empty">No incidents match. Adjust filters or log a new incident.</div>}
      {list.map(c => (
        <div className="rec-card" key={c.id}>
          <div className="rec-top">
            <div className="rec-head">
              {c.photo ? <img className="rec-thumb" src={c.photo} alt="" /> : <div className="rec-thumb-ph">📷</div>}
              <div>
                <div className="rec-name">{c.type} <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, color: 'var(--text-faint)', fontSize: 12 }}>{c.case_id}</span></div>
                <div className="rec-meta">
                  {c.station || 'station not noted'}{c.platform ? ` · PF ${c.platform}` : ''}{c.train ? ` · Train ${c.train}` : ''}{c.coach ? ` · Coach ${c.coach}` : ''}<br/>
                  Reported by {c.reporter || '—'} · {timeAgo(c.created_at)}{c.assigned ? ` · Assigned: ${c.assigned}` : ''}{c.gd_entry ? ` · GD ${c.gd_entry}` : ''}{c.fir ? ` · FIR ${c.fir}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span className={'pill ' + (c.priority === 'Critical' ? 'p-red' : c.priority === 'High' ? 'p-amber' : c.priority === 'Medium' ? 'p-blue' : 'p-gray')}>{c.priority}</span>
              <span className="pill p-gray">{c.status.toUpperCase()}</span>
            </div>
          </div>
          {c.description && <div className="rec-notes">{c.description}</div>}
          {c.remarks && <div className="rec-notes">Remarks: {c.remarks}</div>}
          <Track status={c.status} />
          <div className="rec-actions">
            {NEXT_LABEL[c.status]
              ? <button className="btn small" onClick={() => advance(c)}>{NEXT_LABEL[c.status]}</button>
              : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Closed</span>}
          </div>
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New incident" wide>
        <div className="field-row">
          <div className="field"><label>Type</label><select value={form.type} onChange={set('type')}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label>Priority</label><select value={form.priority} onChange={set('priority')}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Station</label><StationInput value={form.station} onChange={value => setForm(f => ({ ...f, station: value }))} /></div>
          <div className="field"><label>Platform</label><input value={form.platform} onChange={set('platform')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Train number</label><input value={form.train} onChange={set('train')} /></div>
          <div className="field"><label>Coach number</label><input value={form.coach} onChange={set('coach')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>GD entry number</label><input value={form.gdEntry} onChange={set('gdEntry')} /></div>
          <div className="field"><label>FIR number (if any)</label><input value={form.fir} onChange={set('fir')} /></div>
        </div>
        <div className="field"><label>GPS location (optional)</label><input value={form.gps} onChange={set('gps')} placeholder="lat, long" /></div>
        <div className="field-row">
          <div className="field"><label>Reporting officer</label><input value={form.reporter} onChange={set('reporter')} /></div>
          <div className="field"><label>Assigned officer (optional)</label><input value={form.assigned} onChange={set('assigned')} /></div>
        </div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
        <div className="field"><label>Remarks (optional)</label><textarea value={form.remarks} onChange={set('remarks')} /></div>
        <div className="field"><label>Evidence photo (optional)</label>
          <div className="photo-input" onClick={() => document.getElementById('incPhotoInput').click()}>
            {form.photo ? <img src={form.photo} alt="" /> : <span className="photo-ph">Tap to add evidence photo</span>}
          </div>
          <input id="incPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
        </div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save incident</button>
        </div>
      </Modal>

      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="Assign officer">
        <div className="field"><label>Officer name</label><input value={assignName} onChange={e => setAssignName(e.target.value)} autoFocus /></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setAssignFor(null)}>Cancel</button>
          <button className="btn primary" onClick={confirmAssign}>Confirm</button>
        </div>
      </Modal>
    </div>
  );
}
