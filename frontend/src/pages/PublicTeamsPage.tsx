import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Team } from '../types';
import { StatTile } from '../components/StatTile';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { TableIcon, UsersIcon } from '../components/icons';

export function PublicTeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Team[]>('/teams/public')
      .then((res) => {
        if (!cancelled) setTeams(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load teams');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPlayers = useMemo(() => teams?.reduce((sum, t) => sum + (t.roster?.length ?? 0), 0) ?? 0, [teams]);

  return (
    <div className="page">
      <header className="topbar">
        <strong>5quadLeague — Teams</strong>
        <span className="shell-topbar-actions">
          <ThemeToggleButton />
          <Link to="/login">Sign in</Link>
        </span>
      </header>

      {error && <p className="error">{error}</p>}
      {!teams && !error && <p>Loading…</p>}

      {teams && (
        <div className="stat-tile-row">
          <StatTile icon={<UsersIcon />} label="Active teams" value={teams.length} />
          <StatTile icon={<TableIcon />} label="Total players" value={totalPlayers} />
        </div>
      )}

      {teams && teams.length === 0 && <p className="muted">No active teams yet.</p>}

      {teams?.map((team) => (
        <section className="card" key={team.id}>
          <h2>
            {team.name} <span className="muted">({team.roster?.length ?? 0} players)</span>
          </h2>
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
              {team.roster?.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.status}</td>
                  <td>{p.originType}</td>
                  <td>{p.transferValue != null ? `R${p.transferValue}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
