import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils.js';

const CATEGORIES = ['Wallet','Phone','Luggage','Jewellery','Documents','Electronics','Cash','Other'];
const STAGES = ['collected','stored','claimed','returned'];
const LABELS = ['Collected','Stored','Claimed','Returned'];
const NEXT_LABEL = { collected:'Mark stored', stored:'Mark claimed', claimed:'Mark returned' };
const empty = { category:'Wallet', description:'', location:'', foundBy:'' };

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

export default function LostFound() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, foundBy: user?.name || '' });
  const [claimFor, setClaimFor] = useState(null);
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');

  const load = () => api.get('/lostfound', { params: { status, category } }).then(res => setList(res.data.items));
  useEffect(() => { load(); }, [status, category]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.description.trim()) { toast('Add a description', 'warn'); return; }
    try { await api.post('/lostfound', form); toast('Item saved'); setModalOpen(false); setForm({ ...empty, foundBy: user?.name || '' }); load(); }
    catch (e) { toast(e.response?.data?.error || 'Could not save', 'error'); }
  };

  const advance = (item) => {
    const next = STAGES[STAGES.indexOf(item.status) + 1];
    if (next === 'claimed') { setClaimFor(item); setClaimName(''); setClaimPhone(''); return; }
    api.post(`/lostfound/${item.id}/advance`, {}).then(load).catch(e => toast(e.response?.data?.error || 'Could not update', 'error'));
  };
  const confirmClaim = () => {
    if (!claimName.trim()) { toast('Enter a claimant name', 'warn'); return; }
    api.post(`/lostfound/${claimFor.id}/advance`, { claimantName: claimName, claimantPhone: claimPhone })
      .then(() => { setClaimFor(null); load(); })
      .catch(e => toast(e.response?.data?.error || 'Could not update', 'error'));
  };

  return (
    <div>
      <h2 className="vtitle">Lost &amp; found</h2>
      <p className="vsub">Track items from collection through to return.</p>
      <div className="toolbar">
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>{STAGES.map((s, i) => <option key={s} value={s}>{LABELS[i]}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ Log item</button>
      </div>

      {list.length === 0 && <div className="empty">No items match. Adjust filters or add a new item.</div>}
      {list.map(it => (
        <div className="rec-card" key={it.id}>
          <div className="rec-top">
            <div>
              <div className="rec-name">{it.category}</div>
              <div className="rec-meta">{it.description}<br/>Found at {it.location || '—'} by {it.found_by || '—'} · {timeAgo(it.created_at)}{it.claimant_name ? ` · Claimant: ${it.claimant_name}` : ''}</div>
            </div>
            <span className={'pill ' + (it.status === 'returned' ? 'p-green' : it.status === 'claimed' ? 'p-amber' : 'p-gray')}>{it.status.toUpperCase()}</span>
          </div>
          <Track status={it.status} />
          <div className="rec-actions">
            {NEXT_LABEL[it.status] ? <button className="btn small" onClick={() => advance(it)}>{NEXT_LABEL[it.status]}</button> : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Returned</span>}
          </div>
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log lost & found item">
        <div className="field-row">
          <div className="field"><label>Category</label><select value={form.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Station</label><input value={form.location} onChange={set('location')} /></div>
        </div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
        <div className="field"><label>Collected by</label><input value={form.foundBy} onChange={set('foundBy')} /></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save item</button>
        </div>
      </Modal>

      <Modal open={!!claimFor} onClose={() => setClaimFor(null)} title="Claimant details">
        <div className="field"><label>Claimant name</label><input value={claimName} onChange={e => setClaimName(e.target.value)} autoFocus /></div>
        <div className="field"><label>Claimant phone (optional)</label><input value={claimPhone} onChange={e => setClaimPhone(e.target.value)} /></div>
        <div className="modal-actions"><button className="btn secondary" onClick={() => setClaimFor(null)}>Cancel</button><button className="btn primary" onClick={confirmClaim}>Confirm</button></div>
      </Modal>
    </div>
  );
}
