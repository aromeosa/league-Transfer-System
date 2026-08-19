import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Player, Team } from '../types';
import { StatTile } from '../components/StatTile';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { CollapsibleList } from '../components/CollapsibleList';
import { TableIcon, UsersIcon } from '../components/icons';
import { DashboardShell } from '../layout/DashboardShell';
import { getFreeAgentPublicNav } from './FreeAgentsPage';

const ROSTER_MAX = 15;

export function PublicTeamsPage() {
  const { user, token, logout } = useAuth();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [freeAgents, setFreeAgents] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get<Team[]>('/teams/public'), api.get<Player[]>('/players/free-agents')])
      .then(([teamsRes, freeAgentsRes]) => {
        if (cancelled) return;
        setTeams(teamsRes);
        setFreeAgents(freeAgentsRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load teams');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPlayers = useMemo(() => teams?.reduce((sum, t) => sum + (t.roster?.length ?? 0), 0) ?? 0, [teams]);
  const isFreeAgent = user?.role === 'FREE_AGENT';

  return (
    <DashboardShell
      title="Teams"
      navItems={getFreeAgentPublicNav(!!user)}
      userName={user?.name}
      onLogout={user ? logout : undefined}
    >
      {error && <p className="error">{error}</p>}
      {!teams && !error && <p>Loading…</p>}

      {teams && (
        <div className="stat-tile-row">
          <StatTile icon={<UsersIcon />} label="Active teams" value={teams.length} />
          <StatTile icon={<TableIcon />} label="Total players" value={totalPlayers} />
          <StatTile icon={<UsersIcon />} label="Free agents" value={freeAgents?.length ?? 0} />
        </div>
      )}

      {freeAgents && freeAgents.length > 0 && (
        <section className="card">
          <FreeAgentsTable players={freeAgents} />
        </section>
      )}

      {teams && teams.length === 0 && <p className="muted">No active teams yet.</p>}

      {teams?.map((team) => (
        <section className="card" key={team.id}>
          {isFreeAgent && <ApproachTeamButton team={team} token={token} />}
          <CollapsibleList label={team.name} items={team.roster ?? []} getName={(p) => p.name}>
            {(filtered) => (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Origin</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.status}</td>
                      <td>{p.originType}</td>
                      <td>{p.transferValue != null ? `R${p.transferValue}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CollapsibleList>
        </section>
      ))}
    </DashboardShell>
  );
}

/** Lets a logged-in Free Agent approach this team directly — reverse of the usual
 * team-initiates "sign or request a player" flow. Shows up as a notification on the
 * team owner's dashboard once submitted. */
function ApproachTeamButton({ team, token }: { team: Team; token: string | null }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = (team.roster?.length ?? 0) >= ROSTER_MAX;

  async function approach() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/transfer-requests/approach', { teamId: team.id }, token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approach team');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <button disabled={busy || done || full} onClick={approach}>
        {done ? 'Approach sent' : busy ? 'Sending…' : full ? 'Roster full' : 'Approach to join'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
