import { Fragment, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { LegacyReason, LegacyTeam, Player, Team } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { ADMIN_NAV } from '../layout/nav';
import { PlayerNameCell } from '../components/PlayerNameCell';
import { TeamLogo } from '../components/TeamLogo';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { CollapsibleList } from '../components/CollapsibleList';
import { ChevronDownIcon } from '../components/icons';

const LEGACY_REASONS: { value: LegacyReason; label: string }[] = [
  { value: 'QUALIFIED_MAIN_EVENT', label: 'Qualified — Main Event' },
  { value: 'ASSISTED_QUALIFICATION', label: 'Assisted Qualification' },
  { value: 'QUALIFIER_WINNER', label: 'Qualifier Winner' },
  { value: 'TOURNAMENT_WINNER', label: 'Tournament Winner' },
];

export function AdminTeamsPage() {
  const { user, token, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [legacyTeams, setLegacyTeams] = useState<LegacyTeam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  function toggleTeamRoster(id: string) {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<Team[]>('/teams', token),
      api.get<Player[]>('/players', token),
      api.get<LegacyTeam[]>('/legacy-teams', token),
    ])
      .then(([teamsRes, playersRes, legacyTeamsRes]) => {
        if (cancelled) return;
        setTeams(teamsRes);
        setPlayers(playersRes);
        setLegacyTeams(legacyTeamsRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load teams data');
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const rosterRows = useMemo(
    () => teams.flatMap((team) => (team.roster ?? []).map((player) => ({ player, teamName: team.name }))),
    [teams],
  );
  const freeAgents = useMemo(() => players.filter((p) => p.status === 'FREE_AGENT'), [players]);
  const legacyPlayers = useMemo(() => players.filter((p) => p.status === 'LEGACY'), [players]);

  return (
    <DashboardShell
      title="Teams & Rosters"
      userName={user?.name}
      onLogout={logout}
      navItems={ADMIN_NAV}
    >
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Teams ({teams.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Players</th>
              <th>Manager</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const expanded = expandedTeamIds.has(t.id);
              return (
                <Fragment key={t.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="team-name-cell team-roster-row-toggle"
                        onClick={() => toggleTeamRoster(t.id)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${t.name}'s roster`}
                      >
                        <TeamLogo logoUrl={t.logoUrl} />
                        {t.name}
                        <ChevronDownIcon />
                      </button>
                    </td>
                    <td>
                      <span
                        className={`badge ${t.status === 'ACTIVE' ? 'badge-good' : t.status === 'REJECTED' ? 'badge-bad' : 'badge-pending'}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>{t.roster?.length ?? 0}</td>
                    <td>{t.ownerAccount?.name ?? '—'}</td>
                    <td>
                      <MarkTournamentWinnerButton team={t} token={token} onDone={refresh} />
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5}>
                        {(t.roster?.length ?? 0) === 0 ? (
                          <p className="muted">No players on this roster.</p>
                        ) : (
                          <ul className="team-roster-expanded">
                            {t.roster!.map((p) => (
                              <li key={p.id}>
                                <PlayerNameCell player={p} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <FreeAgentsTable players={freeAgents} />
      </section>

      <section className="card">
        <CollapsibleList label="Team Rosters" items={rosterRows} getName={(row) => row.player.name}>
          {(filtered) => (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Origin</th>
                  <th>Value</th>
                  <th>ID verified</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ player, teamName }) => (
                  <tr key={player.id}>
                    <td>
                      <PlayerNameCell player={player} />
                    </td>
                    <td>{teamName}</td>
                    <td>{player.originType}</td>
                    <td>{player.transferValue != null ? `R${player.transferValue}` : '—'}</td>
                    <td>{player.idVerified ? <span className="badge badge-good">✓</span> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleList>
      </section>

      <section className="card">
        <h2>Managers ({teams.filter((t) => t.ownerAccount).length})</h2>
        <table>
          <thead>
            <tr>
              <th>Manager</th>
              <th>Email</th>
              <th>Team</th>
              <th>Team status</th>
            </tr>
          </thead>
          <tbody>
            {teams
              .filter((t) => t.ownerAccount)
              .map((t) => (
                <tr key={t.id}>
                  <td>{t.ownerAccount!.name}</td>
                  <td>{t.ownerAccount!.email}</td>
                  <td>{t.name}</td>
                  <td>
                    <span
                      className={`badge ${t.status === 'ACTIVE' ? 'badge-good' : t.status === 'REJECTED' ? 'badge-bad' : 'badge-pending'}`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Legacy Teams ({legacyTeams.length})</h2>
        <p className="muted">
          A legacy player's club must come from this list — add a team here before adding any of its players.
        </p>
        {legacyTeams.length === 0 ? (
          <p className="muted">No legacy teams yet.</p>
        ) : (
          <ul>
            {legacyTeams.map((t) => (
              <li key={t.id}>
                {t.name}
                {t.ownerAccount ? (
                  <span className="muted"> — owner: {t.ownerAccount.name} ({t.ownerAccount.email})</span>
                ) : (
                  <span className="badge badge-bad" style={{ marginLeft: '0.5rem' }}>
                    No owner — requests skip approval
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddLegacyTeamForm token={token} onAdded={refresh} />
      </section>

      <section className="card">
        <h2>Legacy Pool ({legacyPlayers.length})</h2>
        <p className="muted">
          Teams request to sign from this pool — each team may sign at most one legacy player per transfer window.
        </p>
        {legacyPlayers.length === 0 ? (
          <p className="muted">No legacy players yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Club</th>
                <th>Reason</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {legacyPlayers.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.legacyTeam?.name ?? '—'}</td>
                  <td>{LEGACY_REASONS.find((r) => r.value === p.legacyReason)?.label ?? p.legacyReason ?? '—'}</td>
                  <td>{p.currentTeam ? `Signed — ${p.currentTeam.name}` : 'Available'}</td>
                  <td>
                    {p.currentTeam && (
                      <DeregisterLegacyPlayerButton playerId={p.id} token={token} onDeregistered={refresh} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AddLegacyPlayerForm legacyTeams={legacyTeams} token={token} onAdded={refresh} />
      </section>

      <section className="card">
        <CollapsibleList label="Player transfer counts" items={players} getName={(p) => p.name}>
          {(filtered) => (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Origin</th>
                  <th>Transfers used</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <PlayerNameCell player={p} />
                    </td>
                    <td>{p.currentTeam?.name ?? '— unattached —'}</td>
                    <td>{p.originType}</td>
                    <td>{p.transferCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleList>
      </section>
    </DashboardShell>
  );
}

/** League Admin releases a signed legacy player directly, straight back to "Available"
 * in the pool — no approval step, since the admin already curates the pool directly
 * (unlike a team-initiated deregistration of a regular player, which needs one). */
function DeregisterLegacyPlayerButton({
  playerId,
  token,
  onDeregistered,
}: {
  playerId: string;
  token: string | null;
  onDeregistered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deregister() {
    if (!window.confirm('Deregister this legacy player from their current team? They return to the pool as available.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/players/${playerId}/deregister-legacy`, {}, token);
      onDeregistered();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to deregister player');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button disabled={busy} onClick={deregister}>
        {busy ? 'Deregistering…' : 'Deregister'}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}

/** Promotes every currently-REGISTERED player on this team's roster to LEGACY status
 * at once, tagged "Tournament Winner" — a one-click alternative to adding each player
 * to the Legacy Pool by hand after a team wins a tournament outright. */
function MarkTournamentWinnerButton({
  team,
  token,
  onDone,
}: {
  team: Team;
  token: string | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleCount = (team.roster ?? []).filter((p) => p.status === 'REGISTERED').length;

  async function markWinner() {
    if (
      !window.confirm(
        `Mark "${team.name}" as tournament winner? All ${eligibleCount} registered player(s) on their roster become Legacy players.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/teams/${team.id}/mark-tournament-winner`, {}, token);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark team as tournament winner');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-secondary" disabled={busy || eligibleCount === 0} onClick={markWinner}>
        {busy ? 'Promoting…' : 'Mark tournament winner'}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}

/**
 * Also creates that legacy team's own owner account in the same call — the account
 * that logs in and must approve any request to sign one of this team's players (see
 * TransferRequestsService.legacyTeamDecision). Without an owner, requests for this
 * team's players just fall back to going straight to payment, unapproved.
 */
function AddLegacyTeamForm({ token, onAdded }: { token: string | null; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim() && ownerName.trim() && ownerEmail.trim() && ownerPassword.length >= 8;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        '/legacy-teams',
        { name: name.trim(), owner: { name: ownerName.trim(), email: ownerEmail.trim(), password: ownerPassword } },
        token,
      );
      setName('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add legacy team');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" style={{ marginTop: '1rem' }}>
      <label>
        Legacy team name
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Owner name
        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      </label>
      <label>
        Owner email
        <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
      </label>
      <label>
        Owner password
        <input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} minLength={8} />
      </label>
      <button type="submit" disabled={!valid || submitting}>
        {submitting ? 'Adding…' : 'Add legacy team'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function AddLegacyPlayerForm({
  legacyTeams,
  token,
  onAdded,
}: {
  legacyTeams: LegacyTeam[];
  token: string | null;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [legacyTeamId, setLegacyTeamId] = useState('');
  const [legacyReason, setLegacyReason] = useState<LegacyReason | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !legacyTeamId || !legacyReason) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/players/legacy', { name: name.trim(), legacyTeamId, legacyReason }, token);
      setName('');
      setLegacyTeamId('');
      setLegacyReason('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add legacy player');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" style={{ marginTop: '1rem' }}>
      <label>
        Player name
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Legacy team
        <select value={legacyTeamId} onChange={(e) => setLegacyTeamId(e.target.value)} disabled={legacyTeams.length === 0}>
          <option value="">{legacyTeams.length === 0 ? 'Add a legacy team first' : 'Select a legacy team…'}</option>
          {legacyTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <select value={legacyReason} onChange={(e) => setLegacyReason(e.target.value as LegacyReason)}>
          <option value="">Select a reason…</option>
          {LEGACY_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!name.trim() || !legacyTeamId || !legacyReason || submitting}>
        {submitting ? 'Adding…' : 'Add to pool'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
