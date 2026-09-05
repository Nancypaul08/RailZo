import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import MissingPersons from './pages/MissingPersons.jsx';
import Patrol from './pages/Patrol.jsx';
import Duty from './pages/Duty.jsx';
import LostFound from './pages/LostFound.jsx';
import Officers from './pages/Officers.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import Analytics from './pages/Analytics.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, color: 'var(--text-soft)' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="missing" element={<MissingPersons />} />
          <Route path="patrol" element={<Patrol />} />
          <Route path="duty" element={<Duty />} />
          <Route path="lostfound" element={<LostFound />} />
          <Route path="officers" element={<Officers />} />
          <Route path="log" element={<ActivityLog />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
