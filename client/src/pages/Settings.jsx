import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { compressImage, initials } from '../utils.js';
import StationInput from '../components/StationInput.jsx';

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [station, setStation] = useState(user?.station || '');
  const [photo, setPhoto] = useState(user?.photo || '');

  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.8);
      setPhoto(compressed);
      const res = await api.patch('/auth/me', { photo: compressed });
      updateUser(res.data.user);
    } catch { toast('Could not process photo', 'warn'); }
  };

  const save = async () => {
    try {
      const res = await api.patch('/auth/me', { name, station });
      updateUser(res.data.user);
      toast('Profile saved');
    } catch (e) { toast(e.response?.data?.error || 'Could not save profile', 'error'); }
  };

  return (
    <div>
      <h2 className="vtitle">Settings</h2>
      <p className="vsub">Personal preferences and your account on this platform.</p>
      <div className="settings-grid">
        <div className="panel">
          <div className="panel-head">Appearance</div>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: '0 0 10px' }}>Switch between the dark ops-room theme and a light paper theme.</p>
          <div className="theme-toggle">
            <div className={'theme-opt' + (theme === 'dark' ? ' on' : '')} onClick={() => setTheme('dark')}>Dark (default)</div>
            <div className={'theme-opt' + (theme === 'light' ? ' on' : '')} onClick={() => setTheme('light')}>Light</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">Your profile</div>
          <div className="profile-summary">
            <div className="av">{photo ? <img src={photo} alt="" /> : initials(user?.name)}</div>
            <div className="meta"><b>{user?.name}</b><br/>{user?.badge} · {user?.station || 'Station not set'}<br/>{user?.role}</div>
          </div>
          <div className="photo-input" style={{ height: 70, borderRadius: 10, marginBottom: 12 }} onClick={() => document.getElementById('settingsPhotoInput').click()}>
            <span className="photo-ph">Change photo</span>
          </div>
          <input id="settingsPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
          <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>Station</label><StationInput value={station} onChange={setStation} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small" onClick={save}>Save profile</button>
            <button className="btn secondary small" onClick={logout}>Log out</button>
          </div>
        </div>

        <div className="panel full">
          <div className="panel-head">Security</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            You're signed in with a real JWT session issued by the Railzo API — passwords are hashed with bcrypt and
            never stored in plain text. Role-based permissions (<b>{user?.role}</b>) are enforced on the server for
            write actions, not just hidden in the UI. Every create/update/delete is recorded in the server's audit log.
          </p>
        </div>
      </div>
    </div>
  );
}
