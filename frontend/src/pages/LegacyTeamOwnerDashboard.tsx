import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { TransferRequest } from '../types';
import { StatTile } from '../components/StatTile';
import { RequestTable } from '../components/RequestTable';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TransferIcon } from '../components/icons';

export function LegacyTeamOwnerDashboard() {
  const { user, token, logout } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TransferRequest[]>('/transfer-requests', token)
      .then((res) => {
        if (!cancelled) setRequests(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load requests');
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'PENDING_LEGACY_TEAM_APPROVAL'), [requests]);

  const navItems = [{ label: 'Dashboard', path: '/legacy-team', icon: <HomeIcon /> }];

  return (
    <DashboardShell
      title={`${user?.legacyTeamName ?? 'Legacy Team'} Owner`}
      userName={user?.name}
      onLogout={logout}
      navItems={navItems}
    >
      {error && <p className="error">{error}</p>}

      <div className="stat-tile-row">
        <StatTile icon={<TransferIcon />} label="Requests awaiting your decision" value={pendingRequests.length} />
      </div>

      <section className="card">
        <h2>Requests to sign your legacy players</h2>
        {pendingRequests.length === 0 ? (
          <p className="muted">No teams are currently waiting on a decision from you.</p>
        ) : (
          pendingRequests.map((r) => <RequestRow key={r.id} request={r} token={token} onDecided={refresh} />)
        )}
      </section>

      <section className="card">
        <h2>All requests involving your legacy team</h2>
        <RequestTable requests={requests} />
      </section>
    </DashboardShell>
  );
}

function RequestRow({
  request,
  token,
  onDecided,
}: {
  request: TransferRequest;
  token: string | null;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'APPROVE' | 'REJECT') {
    setBusy(true);
    try {
      await api.post(`/transfer-requests/${request.id}/legacy-team-decision`, { decision }, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.requestingTeam.name}</strong> wants to sign <strong>{request.player.name}</strong> for R
        {request.agreedFee}
      </span>
      <span>
        <button disabled={busy} onClick={() => decide('APPROVE')}>
          Approve
        </button>
        <button disabled={busy} onClick={() => decide('REJECT')}>
          Reject
        </button>
      </span>
    </div>
  );
}
