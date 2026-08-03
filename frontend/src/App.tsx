import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { TeamOwnerDashboard } from './pages/TeamOwnerDashboard';
import { LeagueAdminDashboard } from './pages/LeagueAdminDashboard';
import { RequireAuth } from './auth/RequireAuth';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/team"
        element={
          <RequireAuth role="TEAM_OWNER">
            <TeamOwnerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth role="LEAGUE_ADMIN">
            <LeagueAdminDashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
