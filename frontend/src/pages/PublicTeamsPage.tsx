import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Team } from '../types';

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

  return (
    <div className="page">
      <header className="topbar">
        <strong>5quadLeague — Teams</strong>
        <Link to="/login">Sign in</Link>
      </header>

      {error && <p className="error">{error}</p>}
      {!teams && !error && <p>Loading…</p>}
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
