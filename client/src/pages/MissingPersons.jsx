import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo, compressImage } from '../utils.js';
import StationInput from '../components/StationInput.jsx';

const STAGES = ['reported','assigned','searching','announcementmade','cctvchecked','found','guardianverified','handedover','closed'];
const LABELS = ['Reported','Assigned','Searching','Announcement Made','CCTV Checked','Found','Guardian Verified','Handed Over','Closed'];
const NEXT_LABEL = { reported:'Assign', assigned:'Start search', searching:'Announcement made', announcementmade:'CCTV checked', cctvchecked:'Mark found', found:'Verify guardian', guardianverified:'Hand over', handedover:'Close case' };

const empty = { name:'', photos:[], ageGender:'', guardianName:'', guardianPhone:'', address:'', clothing:'', marks:'', station:'', platform:'', train:'', coach:'', gdEntry:'', fir:'', reporter:'', remarks:'' };

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

export default function MissingPersons() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, reporter: user?.name || '' });

  const [assignFor, setAssignFor] = useState(null);
  const [assignName, setAssignName] = useState('');
  const [foundFor, setFoundFor] = useState(null);
  const [foundByName, setFoundByName] = useState('');
  const [guardianFor, setGuardianFor] = useState(null);

  const load = () => api.get('/missing', { params: { status, q } }).then(res => setList(res.data.missingPersons));
  useEffect(() => { load(); }, [status, q]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...form.photos];
    for (const file of files) {
      if (next.length >= 6) { toast('Maximum 6 photos per case', 'warn'); break; }
      try { next.push(await compressImage(file)); } catch { toast('Could not process one of the photos', 'warn'); }
    }
    setForm(f => ({ ...f, photos: next }));
    e.target.value = '';
  };
  const removePhoto = (i) => setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { toast('Enter a name', 'warn'); return; }
    try {
      await api.post('/missing', form);
      toast('Missing person case saved');
      setModalOpen(false);
      setForm({ ...empty, reporter: user?.name || '' });
      load();
    } catch (e) { toast(e.response?.data?.error || 'Could not save case', 'error'); }
  };

  const advance = (item) => {
    const next = STAGES[STAGES.indexOf(item.status) + 1];
    if (next === 'assigned') { setAssignFor(item); setAssignName(item.assigned || ''); return; }
    if (next === 'found') { setFoundFor(item); setFoundByName(''); return; }
    if (next === 'guardianverified') { setGuardianFor(item); return; }
    api.post(`/missing/${item.id}/advance`, {}).then(load).catch(e => toast(e.response?.data?.error || 'Could not update stage', 'error'));
  };

  const confirmAssign = () => {
    api.post(`/missing/${assignFor.id}/advance`, { assigned: assignName || user?.name })
      .then(() => { setAssignFor(null); load(); })
      .catch(e => toast(e.response?.data?.error || 'Could not assign', 'error'));
  };
  const confirmFound = () => {
    api.post(`/missing/${foundFor.id}/advance`, { foundBy: foundByName || user?.name })
      .then(() => { setFoundFor(null); load(); toast(`${foundFor.name} marked found`); })
      .catch(e => toast(e.response?.data?.error || 'Could not update', 'error'));
  };
  const confirmGuardian = () => {
    api.post(`/missing/${guardianFor.id}/advance`, {})
      .then(() => { setGuardianFor(null); load(); })
      .catch(e => toast(e.response?.data?.error || 'Could not update', 'error'));
  };

  return (
    <div>
      <h2 className="vtitle">Missing person register</h2>
      <p className="vsub">Full case lifecycle from report to guardian verification and hand-over.</p>

      <div className="toolbar">
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STAGES.map((s, i) => <option key={s} value={s}>{LABELS[i]}</option>)}
        </select>
        <input type="text" placeholder="Search by name / station..." value={q} onChange={e => setQ(e.target.value)} />
        <div className="spacer"></div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>+ Report missing person</button>
      </div>

      {list.length === 0 && <div className="empty">No cases match. Try clearing filters, or report a new case.</div>}
      {list.map(c => {
        const photos = c.photos || [];
        return (
          <div className="rec-card" key={c.id}>
            <div className="rec-top">
              <div className="rec-head">
                {photos.length ? <img className="rec-thumb" src={photos[0]} alt="" /> : <div className="rec-thumb-ph">👤</div>}
                <div>
                  <div className="rec-name">{c.name} <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, color: 'var(--text-faint)', fontSize: 12 }}>{c.case_id}</span>
                    {photos.length > 1 && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}> +{photos.length - 1} more photo{photos.length > 2 ? 's' : ''}</span>}
                  </div>
                  <div className="rec-meta">
                    {c.age_gender || '—'} · Last seen: {c.station || 'not noted'}{c.platform ? ` PF ${c.platform}` : ''}{c.train ? ` · Train ${c.train}` : ''}{c.coach ? ` Coach ${c.coach}` : ''}<br/>
                    Guardian: {c.guardian_name || '—'} {c.guardian_phone || ''} · Reported by {c.reporter || '—'} · {timeAgo(c.created_at)}{c.gd_entry ? ` · GD ${c.gd_entry}` : ''}{c.fir ? ` · FIR ${c.fir}` : ''}
                  </div>
                </div>
              </div>
              <span className={'pill ' + (c.priority === 'Critical' ? 'p-red' : 'p-amber')}>{c.status.toUpperCase()}</span>
            </div>
            {(c.clothing || c.marks) && <div className="rec-notes">{c.clothing ? `Clothing: ${c.clothing}. ` : ''}{c.marks ? `Marks: ${c.marks}` : ''}</div>}
            {c.remarks && <div className="rec-notes">Remarks: {c.remarks}</div>}
            <Track status={c.status} />
            <div className="rec-actions">
              {NEXT_LABEL[c.status]
                ? <button className="btn small" onClick={() => advance(c)}>{NEXT_LABEL[c.status]}</button>
                : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Case closed</span>}
            </div>
          </div>
        );
      })}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Report missing person" wide>
        <div className="field"><label>Photos</label>
          <div className="photo-gallery">
            {form.photos.map((src, i) => (
              <div className="gallery-thumb" key={i}><img src={src} alt="" /><button onClick={() => removePhoto(i)}>×</button></div>
            ))}
          </div>
          <div className="photo-input" style={{ height: 80 }} onClick={() => document.getElementById('mpPhotoInput').click()}>
            <span className="photo-ph">Tap to add photo(s)</span>
          </div>
          <input id="mpPhotoInput" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onPhotos} />
        </div>
        <div className="field-row">
          <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} /></div>
          <div className="field"><label>Age / gender</label><input value={form.ageGender} onChange={set('ageGender')} placeholder="e.g. 9 / F" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Guardian name</label><input value={form.guardianName} onChange={set('guardianName')} /></div>
          <div className="field"><label>Guardian phone</label><input value={form.guardianPhone} onChange={set('guardianPhone')} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={set('address')} /></div>
        <div className="field-row">
          <div className="field"><label>Clothing description</label><input value={form.clothing} onChange={set('clothing')} /></div>
          <div className="field"><label>Identification marks</label><input value={form.marks} onChange={set('marks')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Last seen station</label><StationInput value={form.station} onChange={value => setForm(f => ({ ...f, station: value }))} /></div>
          <div className="field"><label>Last seen platform</label><input value={form.platform} onChange={set('platform')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Train number</label><input value={form.train} onChange={set('train')} /></div>
          <div className="field"><label>Coach number</label><input value={form.coach} onChange={set('coach')} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>GD entry number</label><input value={form.gdEntry} onChange={set('gdEntry')} /></div>
          <div className="field"><label>FIR number (if any)</label><input value={form.fir} onChange={set('fir')} /></div>
        </div>
        <div className="field"><label>Reported by</label><input value={form.reporter} onChange={set('reporter')} /></div>
        <div className="field"><label>Remarks (optional)</label><textarea value={form.remarks} onChange={set('remarks')} /></div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={save}>Save case</button>
        </div>
      </Modal>

      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="Assign officer">
        <div className="field"><label>Officer name</label><input value={assignName} onChange={e => setAssignName(e.target.value)} autoFocus /></div>
        <div className="modal-actions"><button className="btn secondary" onClick={() => setAssignFor(null)}>Cancel</button><button className="btn primary" onClick={confirmAssign}>Confirm</button></div>
      </Modal>

      <Modal open={!!foundFor} onClose={() => setFoundFor(null)} title="Found by">
        <div className="field"><label>Officer name</label><input value={foundByName} onChange={e => setFoundByName(e.target.value)} autoFocus /></div>
        <div className="modal-actions"><button className="btn secondary" onClick={() => setFoundFor(null)}>Cancel</button><button className="btn primary" onClick={confirmFound}>Confirm</button></div>
      </Modal>

      <ConfirmDialog open={!!guardianFor} title="Verify guardian" message="Confirm guardian identity has been verified?" onCancel={() => setGuardianFor(null)} onConfirm={confirmGuardian} />
    </div>
  );
}
