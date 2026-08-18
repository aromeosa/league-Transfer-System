import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Player, Team } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TableIcon } from '../components/icons';
import { PlayerNameCell } from '../components/PlayerNameCell';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { CollapsibleList } from '../components/CollapsibleList';

export function AdminTeamsPage() {
  const { user, token, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get<Team[]>('/teams', token), api.get<Player[]>('/players', token)])
      .then(([teamsRes, playersRes]) => {
        if (cancelled) return;
        setTeams(teamsRes);
        setPlayers(playersRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load teams data');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const rosterRows = useMemo(
    () => teams.flatMap((team) => (team.roster ?? []).map((player) => ({ player, teamName: team.name }))),
    [teams],
  );
  const freeAgents = useMemo(() => players.filter((p) => p.status === 'FREE_AGENT'), [players]);

  return (
    <DashboardShell
      title="Teams & Rosters"
      userName={user?.name}
      onLogout={logout}
      navItems={[
        { label: 'Dashboard', path: '/admin', icon: <HomeIcon /> },
        { label: 'Teams & Rosters', path: '/admin/teams', icon: <TableIcon /> },
      ]}
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
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  <span
                    className={`badge ${t.status === 'ACTIVE' ? 'badge-good' : t.status === 'REJECTED' ? 'badge-bad' : 'badge-pending'}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>{t.roster?.length ?? 0}</td>
                <td>{t.ownerAccount?.name ?? '—'}</td>
              </tr>
            ))}
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
                  <th>Status</th>
                  <th>Origin</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ player, teamName }) => (
                  <tr key={player.id}>
                    <td>
                      <PlayerNameCell player={player} />
                    </td>
                    <td>{teamName}</td>
                    <td>{player.status}</td>
                    <td>{player.originType}</td>
                    <td>{player.transferValue != null ? `R${player.transferValue}` : '—'}</td>
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
