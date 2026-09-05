import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('tl_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tl_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(res => { setUser(res.data.user); localStorage.setItem('tl_user', JSON.stringify(res.data.user)); })
      .catch(() => { localStorage.removeItem('tl_token'); localStorage.removeItem('tl_user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (badge, password) => {
    const res = await api.post('/auth/login', { badge, password });
    localStorage.setItem('tl_token', res.data.token);
    localStorage.setItem('tl_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('tl_token', res.data.token);
    localStorage.setItem('tl_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tl_token');
    localStorage.removeItem('tl_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem('tl_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
