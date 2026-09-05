import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${t.type === 'warn' ? 'var(--amber)' : t.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
            borderRadius: 8, padding: '11px 16px', fontSize: 12.5, color: 'var(--text)',
            boxShadow: 'var(--shadow-lg)', minWidth: 220
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
