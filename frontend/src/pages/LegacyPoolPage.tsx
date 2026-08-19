import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { LegacyReason, LegacyTeam, Player, Team, TransferWindow } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TransferIcon, UsersIcon } from '../components/icons';

const VALUE_MIN = 10;
const VALUE_MAX = 20;
const ROSTER_MAX = 15;

const LEGACY_REASON_LABEL: Record<LegacyReason, string> = {
  QUALIFIED_MAIN_EVENT: 'Qualified — Main Event',
  ASSISTED_QUALIFICATION: 'Assisted Qualification',
};

/** Browse by legacy team first, then that team's available legacy players — mirrors
 * how the pool is actually organized (each legacy player belongs to exactly one
 * admin-curated legacy team). */
export function LegacyPoolPage() {
  const { user, token, logout } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [legacyTeams, setLegacyTeams] = useState<LegacyTeam[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [window_, setWindow] = useState<TransferWindow | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [fee, setFee] = useState(VALUE_MIN);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user?.teamId) return;
    let cancelled = false;
    Promise.all([
      api.get<Player[]>('/players?status=LEGACY&unattached=true', token),
      api.get<LegacyTeam[]>('/legacy-teams', token),
      api.get<Team>(`/teams/${user.teamId}`, token),
      api.get<TransferWindow | null>('/transfer-windows/current', token),
    ])
      .then(([playersRes, legacyTeamsRes, teamRes, windowRes]) => {
        if (cancelled) return;
        setPlayers(playersRes);
        setLegacyTeams(legacyTeamsRes);
        setTeam(teamRes);
        setWindow(windowRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load the legacy pool');
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, refreshKey]);

  const rosterSize = team?.roster?.length ?? 0;
  const rosterFull = rosterSize >= ROSTER_MAX;
  const windowOpen = window_?.status === 'OPEN';
  const disabled = !windowOpen || rosterFull;

  const playersForSelectedTeam = players.filter((p) => p.legacyTeam?.id === selectedTeamId);
  const selectedPlayer = playersForSelectedTeam.find((p) => p.id === selectedPlayerId);

  function selectLegacyTeam(id: string) {
    setSelectedTeamId(id);
    setSelectedPlayerId('');
  }

  async function requestSign(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        '/transfer-requests',
        { playerId: selectedPlayer.id, requestType: 'LEGACY_TRANSFER', proposedFee: fee },
        token,
      );
      setSelectedTeamId('');
      setSelectedPlayerId('');
      setFee(VALUE_MIN);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = [
    { label: 'Dashboard', path: '/team', icon: <HomeIcon /> },
    { label: 'League Teams', path: '/teams', icon: <UsersIcon /> },
    { label: 'Free Agents', path: '/free-agents', icon: <UsersIcon /> },
    { label: 'Legacy Pool', path: '/legacy-pool', icon: <UsersIcon /> },
    { label: 'How Transfers Work', path: '/how-it-works', icon: <TransferIcon /> },
  ];

  return (
    <DashboardShell title="Legacy Pool" userName={user?.name} onLogout={logout} navItems={navItems}>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Request a legacy player</h2>
        <p className="muted">Each team may request to sign at most one legacy player per transfer window.</p>
        {!windowOpen && <p className="muted">The transfer window is closed — requests cannot be submitted.</p>}
        {windowOpen && rosterFull && (
          <p className="muted">
            Your roster is full ({rosterSize}/{ROSTER_MAX}) — signing is disabled until it drops below {ROSTER_MAX}.
          </p>
        )}
        {legacyTeams.length === 0 ? (
          <p className="muted">No legacy teams have been added yet.</p>
        ) : (
          <form onSubmit={requestSign} className="inline-form">
            <label>
              Legacy team
              <select value={selectedTeamId} onChange={(e) => selectLegacyTeam(e.target.value)} disabled={disabled}>
                <option value="">Select a legacy team…</option>
                {legacyTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({players.filter((p) => p.legacyTeam?.id === t.id).length})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Player
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                disabled={disabled || !selectedTeamId}
              >
                <option value="">
                  {!selectedTeamId
                    ? 'Select a legacy team first'
                    : playersForSelectedTeam.length === 0
                      ? 'No available players'
                      : 'Select a player…'}
                </option>
                {playersForSelectedTeam.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.legacyReason ? ` — ${LEGACY_REASON_LABEL[p.legacyReason]}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fee (R{VALUE_MIN}–R{VALUE_MAX})
              <input
                type="number"
                min={VALUE_MIN}
                max={VALUE_MAX}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                disabled={disabled}
              />
            </label>
            <button type="submit" disabled={disabled || !selectedPlayerId || submitting}>
              {submitting ? 'Submitting…' : 'Request to sign'}
            </button>
          </form>
        )}
      </section>
    </DashboardShell>
  );
}
