import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { TransferRequest } from '../types';
import { StatTile } from '../components/StatTile';
import { RequestTable } from '../components/RequestTable';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TransferIcon, UsersIcon } from '../components/icons';

export function FreeAgentDashboard() {
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
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load your offers');
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const pendingOffers = useMemo(() => requests.filter((r) => r.status === 'PENDING_PLAYER_APPROVAL'), [requests]);

  const navItems = [
    { label: 'Dashboard', path: '/free-agent', icon: <HomeIcon /> },
    { label: 'League Teams', path: '/teams', icon: <UsersIcon /> },
    { label: 'Free Agents', path: '/free-agents', icon: <UsersIcon /> },
  ];

  return (
    <DashboardShell title={`${user?.name ?? ''} — Free Agent`} userName={user?.name} onLogout={logout} navItems={navItems}>
      {error && <p className="error">{error}</p>}

      <div className="stat-tile-row">
        <StatTile icon={<TransferIcon />} label="Offers awaiting your decision" value={pendingOffers.length} />
      </div>

      <section className="card">
        <h2>Signing offers awaiting your decision</h2>
        {pendingOffers.length === 0 ? (
          <p className="muted">No teams have offered to sign you right now.</p>
        ) : (
          pendingOffers.map((r) => <OfferRow key={r.id} request={r} token={token} onDecided={refresh} />)
        )}
      </section>

      <section className="card">
        <h2>All requests involving you</h2>
        <RequestTable requests={requests} />
      </section>
    </DashboardShell>
  );
}

function OfferRow({
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
      await api.post(`/transfer-requests/${request.id}/player-decision`, { decision }, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.requestingTeam.name}</strong> wants to sign you for R{request.agreedFee}
      </span>
      <span>
        <button disabled={busy} onClick={() => decide('APPROVE')}>
          Accept
        </button>
        <button disabled={busy} onClick={() => decide('REJECT')}>
          Decline
        </button>
      </span>
    </div>
  );
}
