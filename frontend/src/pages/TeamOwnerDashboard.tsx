import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Player, RequestType, Team, TransferRequest, TransferWindow } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function TeamOwnerDashboard() {
  const { user, token, logout } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [window_, setWindow] = useState<TransferWindow | null>(null);
  const [available, setAvailable] = useState<Player[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user?.teamId) return;
    let cancelled = false;

    async function load() {
      try {
        const [teamRes, windowRes, freeAgents, registered, legacy, requestsRes] = await Promise.all([
          api.get<Team>(`/teams/${user!.teamId}`, token),
          api.get<TransferWindow | null>('/transfer-windows/current', token),
          api.get<Player[]>('/players?status=FREE_AGENT', token),
          api.get<Player[]>('/players?status=REGISTERED', token),
          api.get<Player[]>('/players?status=LEGACY', token),
          api.get<TransferRequest[]>('/transfer-requests', token),
        ]);
        if (cancelled) return;
        setTeam(teamRes);
        setWindow(windowRes);
        const myPlayerIds = new Set(teamRes.roster?.map((p) => p.id));
        setAvailable([...freeAgents, ...registered, ...legacy].filter((p) => !myPlayerIds.has(p.id)));
        setRequests(requestsRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, token, refreshKey]);

  const incoming = useMemo(
    () => requests.filter((r) => r.releasingTeam?.id === user?.teamId && r.status === 'PENDING_RELEASING_APPROVAL'),
    [requests, user],
  );
  const awaitingMyPayment = useMemo(
    () => requests.filter((r) => r.requestingTeam.id === user?.teamId && r.status === 'PENDING_PAYMENT'),
    [requests, user],
  );

  if (!team) {
    return (
      <div className="page">
        <TopBar onLogout={logout} title={user?.name ?? ''} />
        {error ? <p className="error">{error}</p> : <p>Loading…</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar onLogout={logout} title={`${team.name} — Team Owner`} />
      {error && <p className="error">{error}</p>}

      <WindowBanner window={window_} />

      <section className="card">
        <h2>Roster ({team.roster?.length ?? 0})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Origin</th>
              <th>Value</th>
              <th>Transfers used</th>
            </tr>
          </thead>
          <tbody>
            {team.roster?.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.status}</td>
                <td>{p.originType}</td>
                <td>{p.transferValue != null ? `R${p.transferValue}` : '—'}</td>
                <td>{p.transferCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <SubmitRequestForm
        available={available}
        windowOpen={window_?.status === 'OPEN'}
        token={token}
        onSubmitted={refresh}
      />

      <RequestsToDecide title="Incoming requests (release a player)" requests={incoming} kind="releasing" token={token} onDecided={refresh} />
      <PaymentsDue title="Outgoing requests awaiting your payment" requests={awaitingMyPayment} token={token} onPaid={refresh} />

      <section className="card">
        <h2>All requests involving your team</h2>
        <RequestTable requests={requests} />
      </section>
    </div>
  );
}

function TopBar({ title, onLogout }: { title: string; onLogout: () => void }) {
  return (
    <header className="topbar">
      <strong>{title}</strong>
      <button onClick={onLogout}>Sign out</button>
    </header>
  );
}

function WindowBanner({ window: w }: { window: TransferWindow | null }) {
  if (!w) return <p className="banner banner-bad">No transfer window is currently open.</p>;
  return (
    <p className={`banner ${w.status === 'OPEN' ? 'banner-good' : 'banner-bad'}`}>
      Transfer window is <strong>{w.status}</strong> ({new Date(w.opensAt).toLocaleDateString()} –{' '}
      {new Date(w.closesAt).toLocaleDateString()})
    </p>
  );
}

function requestTypeFor(player: Player): RequestType {
  if (player.status === 'FREE_AGENT') return 'FREE_AGENT_SIGNING';
  if (player.status === 'LEGACY') return 'LEGACY_TRANSFER';
  return 'CLUB_TRANSFER';
}

function SubmitRequestForm({
  available,
  windowOpen,
  token,
  onSubmitted,
}: {
  available: Player[];
  windowOpen: boolean;
  token: string | null;
  onSubmitted: () => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [fee, setFee] = useState(500);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = available.find((p) => p.id === playerId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/transfer-requests', { playerId, requestType: requestTypeFor(selected), proposedFee: fee }, token);
      setPlayerId('');
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Sign or request a player</h2>
      {!windowOpen && <p className="muted">The transfer window is closed — requests cannot be submitted.</p>}
      <form onSubmit={handleSubmit} className="inline-form">
        <label>
          Player
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required disabled={!windowOpen}>
            <option value="" disabled>
              Select a player…
            </option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status}
                {p.currentTeam ? ` — ${p.currentTeam.name}` : ''})
              </option>
            ))}
          </select>
        </label>
        <label>
          Proposed fee (R500–R5,000)
          <input
            type="number"
            min={500}
            max={5000}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            disabled={!windowOpen}
          />
        </label>
        <button type="submit" disabled={!windowOpen || !playerId || submitting}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function RequestsToDecide({
  title,
  requests,
  token,
  onDecided,
}: {
  title: string;
  requests: TransferRequest[];
  kind: 'releasing';
  token: string | null;
  onDecided: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, decision: 'APPROVE' | 'REJECT') {
    setBusyId(id);
    try {
      await api.post(`/transfer-requests/${id}/releasing-decision`, { decision }, token);
      onDecided();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;
  return (
    <section className="card">
      <h2>{title}</h2>
      {requests.map((r) => (
        <div key={r.id} className="request-row">
          <span>
            <strong>{r.requestingTeam.name}</strong> wants <strong>{r.player.name}</strong> for R{r.agreedFee}
            {r.squadFloorFlag && <span className="badge badge-bad"> below squad floor</span>}
          </span>
          <span>
            <button disabled={busyId === r.id} onClick={() => decide(r.id, 'APPROVE')}>
              Approve
            </button>
            <button disabled={busyId === r.id} onClick={() => decide(r.id, 'REJECT')}>
              Reject
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}

function PaymentsDue({
  title,
  requests,
  token,
  onPaid,
}: {
  title: string;
  requests: TransferRequest[];
  token: string | null;
  onPaid: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function pay(id: string) {
    setBusyId(id);
    try {
      await api.post(`/transfer-requests/${id}/payment/initiate`, {}, token);
      onPaid();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;
  return (
    <section className="card">
      <h2>{title}</h2>
      {requests.map((r) => (
        <div key={r.id} className="request-row">
          <span>
            <strong>{r.player.name}</strong> — R{r.agreedFee} via league payment gateway
          </span>
          <button disabled={busyId === r.id} onClick={() => pay(r.id)}>
            {busyId === r.id ? 'Processing…' : 'Pay now'}
          </button>
        </div>
      ))}
    </section>
  );
}

function RequestTable({ requests }: { requests: TransferRequest[] }) {
  if (requests.length === 0) return <p className="muted">No transfer requests yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Type</th>
          <th>From</th>
          <th>To</th>
          <th>Fee</th>
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
            <td>
              <StatusBadge status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
