import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { LegacyReason, Player, Team, TransferWindow } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TransferIcon, UsersIcon } from '../components/icons';

const VALUE_MIN = 10;
const VALUE_MAX = 20;
const ROSTER_MAX = 15;

const LEGACY_REASON_LABEL: Record<LegacyReason, string> = {
  QUALIFIED_MAIN_EVENT: 'Qualified — Main Event',
  ASSISTED_QUALIFICATION: 'Assisted Qualification',
};

export function LegacyPoolPage() {
  const { user, token, logout } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [window_, setWindow] = useState<TransferWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user?.teamId) return;
    let cancelled = false;
    Promise.all([
      api.get<Player[]>('/players?status=LEGACY&unattached=true', token),
      api.get<Team>(`/teams/${user.teamId}`, token),
      api.get<TransferWindow | null>('/transfer-windows/current', token),
    ])
      .then(([playersRes, teamRes, windowRes]) => {
        if (cancelled) return;
        setPlayers(playersRes);
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
        <h2>Legacy players available to sign ({players.length})</h2>
        <p className="muted">
          Each team may request to sign at most one legacy player per transfer window.
        </p>
        {!windowOpen && <p className="muted">The transfer window is closed — requests cannot be submitted.</p>}
        {windowOpen && rosterFull && (
          <p className="muted">
            Your roster is full ({rosterSize}/{ROSTER_MAX}) — signing is disabled until it drops below {ROSTER_MAX}.
          </p>
        )}
        {players.length === 0 ? (
          <p className="muted">No legacy players available right now.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Club</th>
                <th>Reason</th>
                <th>Fee (R{VALUE_MIN}–R{VALUE_MAX})</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <LegacyPlayerRow key={p.id} player={p} disabled={disabled} token={token} onSubmitted={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardShell>
  );
}

function LegacyPlayerRow({
  player,
  disabled,
  token,
  onSubmitted,
}: {
  player: Player;
  disabled: boolean;
  token: string | null;
  onSubmitted: () => void;
}) {
  const [fee, setFee] = useState(VALUE_MIN);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestSign() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        '/transfer-requests',
        { playerId: player.id, requestType: 'LEGACY_TRANSFER', proposedFee: fee },
        token,
      );
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr>
      <td>{player.name}</td>
      <td>{player.legacyClubName ?? '—'}</td>
      <td>{player.legacyReason ? LEGACY_REASON_LABEL[player.legacyReason] : '—'}</td>
      <td>
        <input
          type="number"
          min={VALUE_MIN}
          max={VALUE_MAX}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          disabled={disabled || submitting || submitted}
          style={{ width: '5rem' }}
        />
      </td>
      <td>
        <button disabled={disabled || submitting || submitted} onClick={requestSign}>
          {submitted ? 'Requested' : submitting ? 'Submitting…' : 'Request to sign'}
        </button>
        {error && <p className="error">{error}</p>}
      </td>
    </tr>
  );
}
