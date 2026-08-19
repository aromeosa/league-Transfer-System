import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Player, RequestType, Team, TransferRequest, TransferWindow } from '../types';
import { StatTile } from '../components/StatTile';
import { DashboardShell } from '../layout/DashboardShell';
import { CameraIcon, HomeIcon, TableIcon, TransferIcon, UsersIcon } from '../components/icons';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { RequestTable } from '../components/RequestTable';
import { resizeImageToDataUrl } from '../utils/resizeImage';

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
  const incomingApproaches = useMemo(
    () => requests.filter((r) => r.requestingTeam.id === user?.teamId && r.status === 'PENDING_TEAM_APPROVAL'),
    [requests, user],
  );
  const awaitingMyPayment = useMemo(
    () => requests.filter((r) => r.requestingTeam.id === user?.teamId && r.status === 'PENDING_PAYMENT'),
    [requests, user],
  );
  const squadValue = useMemo(
    () => team?.roster?.reduce((sum, p) => sum + (p.transferValue ?? 0), 0) ?? 0,
    [team],
  );

  const navItems = [
    { label: 'Dashboard', path: '/team', icon: <HomeIcon /> },
    { label: 'League Teams', path: '/teams', icon: <UsersIcon /> },
    { label: 'Free Agents', path: '/free-agents', icon: <UsersIcon /> },
    { label: 'How Transfers Work', path: '/how-it-works', icon: <TransferIcon /> },
  ];

  if (!team) {
    return (
      <DashboardShell title={user?.name ?? ''} userName={user?.name} onLogout={logout} navItems={navItems}>
        {error ? <p className="error">{error}</p> : <p>Loading…</p>}
      </DashboardShell>
    );
  }

  if (team.status !== 'ACTIVE') {
    return (
      <DashboardShell
        title={`${team.name} — Team Owner`}
        userName={user?.name}
        onLogout={logout}
        navItems={navItems}
      >
        {team.status === 'PENDING_APPROVAL' ? (
          <p className="banner banner-bad">
            Your team registration is still pending League Admin approval. Check back once it's been reviewed.
          </p>
        ) : (
          <p className="banner banner-bad">Your team registration was rejected.</p>
        )}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`${team.name} — Team Owner`} userName={user?.name} onLogout={logout} navItems={navItems}>
      {error && <p className="error">{error}</p>}

      <div className="stat-tile-row">
        <StatTile icon={<UsersIcon />} label="Roster size" value={team.roster?.length ?? 0} />
        <StatTile icon={<TableIcon />} label="Squad value" value={`R${squadValue}`} />
        <StatTile icon={<TransferIcon />} label="Incoming requests" value={incoming.length} />
        <StatTile icon={<UsersIcon />} label="Free agent approaches" value={incomingApproaches.length} />
        <StatTile icon={<TransferIcon />} label="Awaiting payment" value={awaitingMyPayment.length} />
      </div>

      <WindowBanner window={window_} />

      <IncomingApproaches requests={incomingApproaches} token={token} onDecided={refresh} />

      <section className="card">
        <h2>Roster ({team.roster?.length ?? 0})</h2>
        <p className="muted">
          {window_?.status === 'OPEN'
            ? 'The transfer window is open — you can adjust player values below.'
            : 'Player values are locked until the next transfer window opens.'}
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Status</th>
              <th>Origin</th>
              <th>Value</th>
              <th>Transfers used</th>
              <th>ID verified</th>
            </tr>
          </thead>
          <tbody>
            {team.roster?.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>
                  <PlayerAvatarCell player={p} token={token} onUpdated={refresh} />
                </td>
                <td>{p.status}</td>
                <td>{p.originType}</td>
                <td>
                  <PlayerValueCell
                    player={p}
                    editable={window_?.status === 'OPEN'}
                    token={token}
                    onUpdated={refresh}
                  />
                </td>
                <td>{p.transferCount}</td>
                <td>{p.idVerified ? <span className="badge badge-good">✓</span> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <AddPlayerForm
        rosterSize={team.roster?.length ?? 0}
        windowOpen={window_?.status === 'OPEN'}
        token={token}
        onAdded={refresh}
      />

      <SubmitRequestForm
        available={available}
        rosterSize={team.roster?.length ?? 0}
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
    </DashboardShell>
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

function PlayerAvatarCell({
  player,
  token,
  onUpdated,
}: {
  player: Player;
  token: string | null;
  onUpdated: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const photoDataUrl = await resizeImageToDataUrl(file);
      await api.patch(`/players/${player.id}/photo`, { photoDataUrl }, token);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="player-name-cell">
      <button
        type="button"
        className="player-avatar-wrap editable"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        aria-label={`Upload a photo for ${player.name}`}
        title="Upload a photo"
      >
        <PlayerAvatar avatarUrl={player.avatarUrl} />
        <span className="player-avatar-badge">
          <CameraIcon />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <span>
        {player.name}
        {error && (
          <>
            <br />
            <span className="error">{error}</span>
          </>
        )}
      </span>
    </span>
  );
}

// Deliberately tiny right now for live PayFast testing with real transactions.
const VALUE_MIN = 10;
const VALUE_MAX = 20;

// Mirrors the backend's roster ceiling (§4.2 / BusinessRules.ROSTER_MAX) — signing a
// free agent is disabled once a roster is already full, re-enabled once it drops below.
const ROSTER_MAX = 15;

function PlayerValueCell({
  player,
  editable,
  token,
  onUpdated,
}: {
  player: Player;
  editable: boolean;
  token: string | null;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(player.transferValue ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <span className="player-value-cell">
        {player.transferValue != null ? `R${player.transferValue}` : '—'}
        {editable && (
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => {
              setValue(String(player.transferValue ?? ''));
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
      </span>
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/players/${player.id}/value`, { transferValue: Number(value) }, token);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update value');
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="player-value-cell">
      <input
        type="number"
        className="player-value-input"
        min={VALUE_MIN}
        max={VALUE_MAX}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="button" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="btn-secondary btn-small" disabled={saving} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error && <span className="error">{error}</span>}
    </span>
  );
}

function requestTypeFor(player: Player): RequestType {
  if (player.status === 'FREE_AGENT') return 'FREE_AGENT_SIGNING';
  if (player.status === 'LEGACY') return 'LEGACY_TRANSFER';
  return 'CLUB_TRANSFER';
}

interface PlayerGroup {
  key: string;
  label: string;
  players: Player[];
}

/** Free Agents float to the top (no releasing team's approval needed to sign one). */
function groupPlayersByTeam(players: Player[]): PlayerGroup[] {
  const groups = new Map<string, PlayerGroup>();
  for (const p of players) {
    const key = p.currentTeam?.id ?? 'free-agents';
    const label = p.currentTeam?.name ?? 'Free Agents';
    if (!groups.has(key)) groups.set(key, { key, label, players: [] });
    groups.get(key)!.players.push(p);
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.key === 'free-agents' ? -1 : b.key === 'free-agents' ? 1 : a.label.localeCompare(b.label),
  );
}

function PlayerPicker({
  players,
  value,
  onChange,
  disabled,
}: {
  players: Player[];
  value: string;
  onChange: (playerId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = players.find((p) => p.id === value);
  const groups = useMemo(() => groupPlayersByTeam(players), [players]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? players.filter((p) => p.name.toLowerCase().includes(q)) : [];
  }, [players, query]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function toggleOpen() {
    if (disabled) return;
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setQuery('');
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      return !wasOpen;
    });
  }

  function select(player: Player) {
    onChange(player.id);
    setOpen(false);
  }

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="player-picker" ref={wrapRef}>
      <button
        type="button"
        className="player-picker-trigger"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected
          ? `${selected.name} (${selected.status}${selected.currentTeam ? ` — ${selected.currentTeam.name}` : ''})`
          : 'Select a player…'}
      </button>
      {open && (
        <div className="player-picker-panel">
          <input
            ref={searchRef}
            type="text"
            className="player-picker-search"
            placeholder="Search players by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="player-picker-list">
            {query.trim() ? (
              matches.length === 0 ? (
                <p className="muted player-picker-empty">No players match &ldquo;{query}&rdquo;.</p>
              ) : (
                matches.map((p) => (
                  <button type="button" key={p.id} className="player-picker-option" onClick={() => select(p)}>
                    <span>{p.name}</span>
                    <span className="muted">
                      {p.status}
                      {p.currentTeam ? ` — ${p.currentTeam.name}` : ''}
                    </span>
                  </button>
                ))
              )
            ) : groups.length === 0 ? (
              <p className="muted player-picker-empty">No players available.</p>
            ) : (
              groups.map((g) => (
                <div key={g.key} className="player-picker-group">
                  <button type="button" className="player-picker-group-header" onClick={() => toggleGroup(g.key)}>
                    <span>{g.label}</span>
                    <span className="muted">{g.players.length}</span>
                  </button>
                  {expanded.has(g.key) && (
                    <div className="player-picker-group-players">
                      {g.players.map((p) => (
                        <button type="button" key={p.id} className="player-picker-option" onClick={() => select(p)}>
                          <span>{p.name}</span>
                          <span className="muted">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Add player" — separate from "Sign or request a player": registers a brand-new
 * player straight onto the owner's own roster, no other team/free agent/approval step
 * involved. Same window-gate and roster-cap rules as every other roster-composition
 * change: once you register your initial minimum of 5, you can keep adding players
 * until the roster hits the 15-player cap, then it's disabled until it drops back down.
 */
function AddPlayerForm({
  rosterSize,
  windowOpen,
  token,
  onAdded,
}: {
  rosterSize: number;
  windowOpen: boolean;
  token: string | null;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const atCap = rosterSize >= ROSTER_MAX;
  const disabled = !windowOpen || atCap;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        '/players',
        {
          name: name.trim(),
          ...(value ? { transferValue: Number(value) } : {}),
          ...(idNumber.trim() ? { idNumber: idNumber.trim() } : {}),
        },
        token,
      );
      setName('');
      setValue('');
      setIdNumber('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add player');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Add a new player</h2>
      <p className="muted">
        Register a brand-new player straight onto your roster — separate from signing or requesting an existing
        player.
      </p>
      {!windowOpen && <p className="muted">The transfer window is closed — players cannot be added.</p>}
      {windowOpen && atCap && (
        <p className="muted">
          Your roster is full ({rosterSize}/{ROSTER_MAX}) — you can add players again once it drops below{' '}
          {ROSTER_MAX}.
        </p>
      )}
      <form onSubmit={handleSubmit} className="inline-form">
        <label>
          Player name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
        </label>
        <label>
          Value (optional, R{VALUE_MIN}–R{VALUE_MAX})
          <input
            type="number"
            min={VALUE_MIN}
            max={VALUE_MAX}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            placeholder="Optional"
          />
        </label>
        <label>
          ID/passport number (optional)
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            disabled={disabled}
            minLength={4}
            placeholder="Optional"
          />
        </label>
        <button type="submit" disabled={disabled || !name.trim() || submitting}>
          {submitting ? 'Adding…' : 'Add player'}
        </button>
      </form>
      <p className="muted">Used only to confirm this isn't a duplicate registration — never shown to anyone.</p>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function SubmitRequestForm({
  available,
  rosterSize,
  windowOpen,
  token,
  onSubmitted,
}: {
  available: Player[];
  rosterSize: number;
  windowOpen: boolean;
  token: string | null;
  onSubmitted: () => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [fee, setFee] = useState(VALUE_MIN);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Signing a free agent is disabled once the roster is at the 15-player cap — club
  // transfers/legacy transfers stay selectable (the backend still enforces the same
  // cap for those, this just doesn't proactively hide them here).
  const canSignFreeAgents = rosterSize < ROSTER_MAX;
  const selectable = canSignFreeAgents ? available : available.filter((p) => p.status !== 'FREE_AGENT');

  const selected = selectable.find((p) => p.id === playerId);
  // Only a free agent signing can be free — a team proposes the fee (the free agent
  // never lists one themselves), and leaving it at R0 signs them for free.
  const isFreeAgentSigning = selected?.status === 'FREE_AGENT';

  function selectPlayer(id: string) {
    setPlayerId(id);
    const player = selectable.find((p) => p.id === id);
    setFee(player?.status === 'FREE_AGENT' ? 0 : VALUE_MIN);
  }

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
      {!canSignFreeAgents && (
        <p className="muted">
          Your roster is full ({rosterSize}/{ROSTER_MAX}) — signing free agents is disabled until it drops below{' '}
          {ROSTER_MAX}. Club/legacy transfers are still available.
        </p>
      )}
      <form onSubmit={handleSubmit} className="inline-form">
        <label>
          Player
          <PlayerPicker players={selectable} value={playerId} onChange={selectPlayer} disabled={!windowOpen} />
        </label>
        <label>
          {isFreeAgentSigning ? `Transfer fee (optional — R0 to sign for free, or R${VALUE_MIN}–R${VALUE_MAX})` : `Proposed fee (R${VALUE_MIN}–R${VALUE_MAX})`}
          <input
            type="number"
            min={isFreeAgentSigning ? 0 : VALUE_MIN}
            max={VALUE_MAX}
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

/**
 * Notifications for Free Agents who approached this team directly (reverse of the
 * usual "sign or request a player" flow — the team never proposes a fee on submission
 * here, since there was no submission by the team; they set one now, on acceptance.
 */
function IncomingApproaches({
  requests,
  token,
  onDecided,
}: {
  requests: TransferRequest[];
  token: string | null;
  onDecided: () => void;
}) {
  if (requests.length === 0) return null;
  return (
    <section className="card">
      <h2>Free agents wanting to join ({requests.length})</h2>
      {requests.map((r) => (
        <ApproachRow key={r.id} request={r} token={token} onDecided={onDecided} />
      ))}
    </section>
  );
}

function ApproachRow({
  request,
  token,
  onDecided,
}: {
  request: TransferRequest;
  token: string | null;
  onDecided: () => void;
}) {
  const [fee, setFee] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'APPROVE' | 'REJECT') {
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/transfer-requests/${request.id}/team-decision`,
        decision === 'APPROVE' ? { decision, fee } : { decision },
        token,
      );
      onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to decide');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.player.name}</strong> wants to join your team
      </span>
      <span>
        <label className="muted" style={{ marginRight: '0.5rem' }}>
          Fee (R0 = free)
          <input
            type="number"
            min={0}
            max={VALUE_MAX}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            disabled={busy}
            style={{ width: '5rem', marginLeft: '0.4rem' }}
          />
        </label>
        <button disabled={busy} onClick={() => decide('APPROVE')}>
          Accept
        </button>
        <button disabled={busy} onClick={() => decide('REJECT')}>
          Decline
        </button>
      </span>
      {error && <p className="error">{error}</p>}
    </div>
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
  const [error, setError] = useState<string | null>(null);

  async function pay(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = await api.post<{ redirectUrl?: string }>(`/transfer-requests/${id}/payment/initiate`, {}, token);
      if (result.redirectUrl) {
        // Sending the browser to PayFast's hosted checkout — nothing left to refresh
        // here, the page is about to navigate away.
        window.location.href = result.redirectUrl;
        return;
      }
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start payment');
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
      {error && <p className="error">{error}</p>}
    </section>
  );
}

