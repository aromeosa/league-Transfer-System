import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { TeamRegisterPage } from './pages/TeamRegisterPage';
import { PublicTeamsPage } from './pages/PublicTeamsPage';
import { TeamOwnerDashboard } from './pages/TeamOwnerDashboard';
import { LeagueAdminDashboard } from './pages/LeagueAdminDashboard';
import { AdminTeamsPage } from './pages/AdminTeamsPage';
import { HowTransfersWorkPage } from './pages/HowTransfersWorkPage';
import { RequireAuth } from './auth/RequireAuth';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<TeamRegisterPage />} />
      <Route path="/teams" element={<PublicTeamsPage />} />
      <Route
        path="/team"
        element={
          <RequireAuth role="TEAM_OWNER">
            <TeamOwnerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/how-it-works"
        element={
          <RequireAuth role="TEAM_OWNER">
            <HowTransfersWorkPage />
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
      <Route
        path="/admin/teams"
        element={
          <RequireAuth role="LEAGUE_ADMIN">
            <AdminTeamsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
