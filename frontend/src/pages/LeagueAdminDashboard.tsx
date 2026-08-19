import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { DeregistrationReason, Player, PlayerDeregistrationRequest, Team, TransferRequest, TransferWindow } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { PaymentTimeline } from '../components/PaymentTimeline';
import { StatTile } from '../components/StatTile';
import { TeamRegistrationForm } from '../components/TeamRegistrationForm';
import { DashboardShell } from '../layout/DashboardShell';
import { ADMIN_NAV } from '../layout/nav';
import { TableIcon, TransferIcon, UserCogIcon, UsersIcon } from '../components/icons';

export function LeagueAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [window_, setWindow] = useState<TransferWindow | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [deregistrations, setDeregistrations] = useState<PlayerDeregistrationRequest[]>([]);
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const [activeTeamCount, setActiveTeamCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(new Set());
  function togglePaymentTimeline(id: string) {
    setExpandedPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [windowRes, requestsRes, deregistrationsRes, pendingTeamsRes, activeTeamsRes, playersRes] =
          await Promise.all([
            api.get<TransferWindow | null>('/transfer-windows/current', token),
            api.get<TransferRequest[]>('/transfer-requests', token),
            api.get<PlayerDeregistrationRequest[]>('/player-deregistrations', token),
            api.get<Team[]>('/teams?status=PENDING_APPROVAL', token),
            api.get<Team[]>('/teams?status=ACTIVE', token),
            api.get<Player[]>('/players', token),
          ]);
        if (cancelled) return;
        setWindow(windowRes);
        setRequests(requestsRes);
        setDeregistrations(deregistrationsRes);
        setPendingTeams(pendingTeamsRes);
        setActiveTeamCount(activeTeamsRes.length);
        setPlayerCount(playersRes.length);
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
  const pendingDeregistrations = deregistrations.filter((d) => d.status === 'PENDING_LEAGUE_APPROVAL');

  return (
    <DashboardShell
      title="League Admin Dashboard"
      userName={user?.name}
      onLogout={logout}
      navItems={ADMIN_NAV}
    >
      {error && <p className="error">{error}</p>}

      <div className="stat-tile-row">
        <StatTile icon={<UsersIcon />} label="Active teams" value={activeTeamCount} />
        <StatTile icon={<UserCogIcon />} label="Pending approvals" value={pendingTeams.length} />
        <StatTile icon={<TransferIcon />} label="Awaiting League decision" value={pendingLeague.length} />
        <StatTile icon={<UsersIcon />} label="Pending deregistrations" value={pendingDeregistrations.length} />
        <StatTile icon={<TableIcon />} label="Total players" value={playerCount} />
      </div>

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
        <h2>Pending player deregistrations</h2>
        {pendingDeregistrations.length === 0 ? (
          <p className="muted">Nothing pending.</p>
        ) : (
          pendingDeregistrations.map((d) => (
            <DeregistrationDecisionRow key={d.id} request={d} token={token} onDecided={refresh} />
          ))
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
              <th>Payment</th>
              <th>Squad floor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>{r.player.name}</td>
                  <td>{r.requestType}</td>
                  <td>{r.releasingTeam?.name ?? '—'}</td>
                  <td>{r.requestingTeam.name}</td>
                  <td>R{r.agreedFee}</td>
                  <td>
                    <PaymentStatusBadge payment={r.payment} />
                    {r.payment?.status === 'INITIATED' && (
                      <ConfirmPaymentManuallyButton requestId={r.id} token={token} onConfirmed={refresh} />
                    )}
                    {r.payment && (
                      <button type="button" className="btn-small" onClick={() => togglePaymentTimeline(r.id)}>
                        {expandedPaymentIds.has(r.id) ? 'Hide timeline' : 'Show timeline'}
                      </button>
                    )}
                  </td>
                  <td>{r.squadFloorFlag ? <span className="badge badge-bad">flagged</span> : '—'}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
                {expandedPaymentIds.has(r.id) && (
                  <tr>
                    <td colSpan={7}>
                      <PaymentTimeline requestId={r.id} payment={r.payment} canManage token={token} onUpdated={refresh} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
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
  const [busy, setBusy] = useState<'open' | 'close' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function forceOpen() {
    setBusy('open');
    setError(null);
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to open a window');
    } finally {
      setBusy(null);
    }
  }

  async function forceClose() {
    if (!window.confirm('Force-close the current transfer window? Any request still unresolved will be cancelled.')) {
      return;
    }
    setBusy('close');
    setError(null);
    try {
      await api.post('/transfer-windows/force-close', {}, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to close the window');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <h2>Transfer window</h2>
      <p className="muted">
        Opens automatically from the 1st to the 7th of every month. Use these to override that schedule at any time.
      </p>
      {w ? (
        <p className={`banner ${w.status === 'OPEN' ? 'banner-good' : 'banner-bad'}`}>
          Status: <strong>{w.status}</strong> ({new Date(w.opensAt).toLocaleString()} –{' '}
          {new Date(w.closesAt).toLocaleString()})
        </p>
      ) : (
        <p className="banner banner-bad">No window scheduled.</p>
      )}
      <div>
        <button disabled={busy !== null} onClick={forceOpen}>
          {busy === 'open' ? 'Opening…' : 'Force-open a window now'}
        </button>
        <button disabled={busy !== null || w?.status !== 'OPEN'} onClick={forceClose}>
          {busy === 'close' ? 'Closing…' : 'Force-close the current window'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
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

const DEREGISTRATION_REASON_LABEL: Record<DeregistrationReason, string> = {
  BAD_BEHAVIOUR: 'Bad behaviour',
  MUTUAL_AGREEMENT: 'Mutual agreement',
};

/** The reason is shown up front, before Approve/Reject — this is the actual
 * authorization gate: the player only leaves the roster once approved here. */
function DeregistrationDecisionRow({
  request,
  token,
  onDecided,
}: {
  request: PlayerDeregistrationRequest;
  token: string | null;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'APPROVE' | 'REJECT') {
    setBusy(true);
    try {
      await api.post(`/player-deregistrations/${request.id}/decision`, { decision }, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.team.name}</strong> wants to deregister <strong>{request.player.name}</strong> —{' '}
        <span className="badge badge-pending">{DEREGISTRATION_REASON_LABEL[request.reason]}</span>
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

/** Escape hatch for when PayFast's ITN never arrives despite the payer having actually
 * paid — the League Admin confirms it manually after checking the PayFast dashboard. */
function ConfirmPaymentManuallyButton({
  requestId,
  token,
  onConfirmed,
}: {
  requestId: string;
  token: string | null;
  onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!window.confirm('Confirm this payment manually? Only do this after verifying it in the PayFast dashboard.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/transfer-requests/${requestId}/payment/confirm-manually`, {}, token);
      onConfirmed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to confirm payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button disabled={busy} onClick={confirm} style={{ marginTop: '0.25rem' }}>
        {busy ? 'Confirming…' : 'Confirm manually'}
      </button>
      {error && <p className="error">{error}</p>}
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
