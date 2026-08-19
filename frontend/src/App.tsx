import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TeamRegisterPage } from './pages/TeamRegisterPage';
import { PublicTeamsPage } from './pages/PublicTeamsPage';
import { FreeAgentsPage } from './pages/FreeAgentsPage';
import { TeamOwnerDashboard } from './pages/TeamOwnerDashboard';
import { FreeAgentDashboard } from './pages/FreeAgentDashboard';
import { LegacyTeamOwnerDashboard } from './pages/LegacyTeamOwnerDashboard';
import { LeagueAdminDashboard } from './pages/LeagueAdminDashboard';
import { AdminTeamsPage } from './pages/AdminTeamsPage';
import { AdminEventsPage } from './pages/AdminEventsPage';
import { HowTransfersWorkPage } from './pages/HowTransfersWorkPage';
import { LegacyPoolPage } from './pages/LegacyPoolPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { RequireAuth } from './auth/RequireAuth';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/register" element={<TeamRegisterPage />} />
      <Route path="/teams" element={<PublicTeamsPage />} />
      <Route path="/free-agents" element={<FreeAgentsPage />} />
      <Route
        path="/team"
        element={
          <RequireAuth role="TEAM_OWNER">
            <TeamOwnerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/free-agent"
        element={
          <RequireAuth role="FREE_AGENT">
            <FreeAgentDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/legacy-team"
        element={
          <RequireAuth role="LEGACY_TEAM_OWNER">
            <LegacyTeamOwnerDashboard />
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
        path="/legacy-pool"
        element={
          <RequireAuth role="TEAM_OWNER">
            <LegacyPoolPage />
          </RequireAuth>
        }
      />
      <Route
        path="/payment-result"
        element={
          <RequireAuth role="TEAM_OWNER">
            <PaymentResultPage />
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
      <Route
        path="/admin/events"
        element={
          <RequireAuth role="LEAGUE_ADMIN">
            <AdminEventsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
