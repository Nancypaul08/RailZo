import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StationInput from '../components/StationInput.jsx';
import { compressImage } from '../utils.js';

const ROLES = ['Admin', 'Inspector', 'Sub Inspector', 'Constable', 'Control Room Operator', 'Supervisor'];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [station, setStation] = useState('');
  const [role, setRole] = useState('Constable');
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { setPhoto(await compressImage(file)); } catch { setError('Could not process photo'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') {
        await login(badge.trim(), password);
      } else {
        if (!name.trim() || !badge.trim() || !password) throw new Error('Name, badge number and password are required');
        await register({ name: name.trim(), badge: badge.trim(), password, station: station.trim(), role, photo });
      }
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand"><span className="sb-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }}></span><b>Railzo</b></div>
        <p className="login-sub">AI-powered RPF operations platform</p>

        <div className="login-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>New officer account</button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="photo-input" onClick={() => document.getElementById('loginPhotoInput').click()} style={{ height: 90, borderRadius: '50%', width: 90, margin: '0 auto 16px' }}>
                {photo ? <img src={photo} alt="" /> : <span className="photo-ph">Add photo</span>}
              </div>
              <input id="loginPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
              <div className="field"><label>Officer name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
            </>
          )}
          <div className="field-row">
            <div className="field"><label>Badge number</label><input value={badge} onChange={e => setBadge(e.target.value)} placeholder="e.g. RPF-2291" /></div>
            <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
          </div>
          {mode === 'register' && (
            <>
              <div className="field"><label>Station</label><StationInput value={station} onChange={setStation} placeholder="e.g. PNBE or Patna" /></div>
              <div className="field"><label>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}
          <button className="btn primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="login-note">
          {mode === 'login'
            ? <>Demo login — badge <b>RPF-0001</b>, password <b>demo1234</b> (after running the seed script).</>
            : 'New accounts default to a Constable-level role; an Admin can change this later.'}
          <br/>Passwords are hashed with bcrypt and sessions use JWTs issued by this server.
        </p>
      </div>
    </div>
  );
}
