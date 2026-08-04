import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Team, TransferRequest, TransferWindow } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TeamRegistrationForm } from '../components/TeamRegistrationForm';

export function LeagueAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [window_, setWindow] = useState<TransferWindow | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [windowRes, requestsRes, pendingTeamsRes] = await Promise.all([
          api.get<TransferWindow | null>('/transfer-windows/current', token),
          api.get<TransferRequest[]>('/transfer-requests', token),
          api.get<Team[]>('/teams?status=PENDING_APPROVAL', token),
        ]);
        if (cancelled) return;
        setWindow(windowRes);
        setRequests(requestsRes);
        setPendingTeams(pendingTeamsRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const pendingLeague = requests.filter((r) => r.status === 'PENDING_LEAGUE_APPROVAL');

  return (
    <div className="page">
      <header className="topbar">
        <strong>{user?.name} — League Admin</strong>
        <button onClick={logout}>Sign out</button>
      </header>
      {error && <p className="error">{error}</p>}

      <WindowControls window={window_} token={token} onChanged={refresh} />

      <section className="card">
        <h2>Pending team registrations</h2>
        {pendingTeams.length === 0 ? (
          <p className="muted">No teams awaiting approval.</p>
        ) : (
          pendingTeams.map((t) => <PendingTeamRow key={t.id} team={t} token={token} onDecided={refresh} />)
        )}
      </section>

      <section className="card">
        <h2>Register a new team</h2>
        <p className="muted">Creates a team directly — active immediately, no approval step.</p>
        <TeamRegistrationForm endpoint="/teams" token={token} submitLabel="Create team" onSuccess={refresh} />
      </section>

      <section className="card">
        <h2>Awaiting League Admin decision</h2>
        {pendingLeague.length === 0 ? (
          <p className="muted">Nothing pending.</p>
        ) : (
          pendingLeague.map((r) => <LeagueDecisionRow key={r.id} request={r} token={token} onDecided={refresh} />)
        )}
      </section>

      <section className="card">
        <h2>All transfer requests</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Fee</th>
              <th>Squad floor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.player.name}</td>
                <td>{r.requestType}</td>
                <td>{r.releasingTeam?.name ?? '—'}</td>
                <td>{r.requestingTeam.name}</td>
                <td>R{r.agreedFee}</td>
                <td>{r.squadFloorFlag ? <span className="badge badge-bad">flagged</span> : '—'}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function WindowControls({
  window: w,
  token,
  onChanged,
}: {
  window: TransferWindow | null;
  token: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function openForTesting() {
    setBusy(true);
    try {
      const now = Date.now();
      await api.post(
        '/transfer-windows',
        {
          opensAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          closesAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        token,
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Transfer window</h2>
      {w ? (
        <p className={`banner ${w.status === 'OPEN' ? 'banner-good' : 'banner-bad'}`}>
          Status: <strong>{w.status}</strong> ({new Date(w.opensAt).toLocaleString()} –{' '}
          {new Date(w.closesAt).toLocaleString()})
        </p>
      ) : (
        <p className="banner banner-bad">No window scheduled.</p>
      )}
      <button disabled={busy} onClick={openForTesting}>
        {busy ? 'Opening…' : 'Force-open a window now'}
      </button>
    </section>
  );
}

function LeagueDecisionRow({
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
      await api.post(`/transfer-requests/${request.id}/league-decision`, { decision }, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.requestingTeam.name}</strong> ← <strong>{request.player.name}</strong> (
        {request.releasingTeam?.name ?? 'Free Agent'}) for R{request.agreedFee}
        {request.squadFloorFlag && <span className="badge badge-bad"> squad floor breach</span>}
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

function PendingTeamRow({ team, token, onDecided }: { team: Team; token: string | null; onDecided: () => void }) {
  const [busy, setBusy] = useState(false);

  async function decide(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await api.post(`/teams/${team.id}/${action}`, {}, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{team.name}</strong> — owner {team.ownerAccount?.name} ({team.ownerAccount?.email}),{' '}
        {team.roster?.length ?? 0} players
      </span>
      <span>
        <button disabled={busy} onClick={() => decide('approve')}>
          Approve
        </button>
        <button disabled={busy} onClick={() => decide('reject')}>
          Reject
        </button>
      </span>
    </div>
  );
}
