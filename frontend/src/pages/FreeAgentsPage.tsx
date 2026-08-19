import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Player } from '../types';
import { StatTile } from '../components/StatTile';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { UsersIcon } from '../components/icons';
import { Logo } from '../components/Logo';

export function FreeAgentsPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Player[]>('/players/free-agents')
      .then((res) => {
        if (!cancelled) setPlayers(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load free agents');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar-brand">
          <Logo />
          <strong>Free Agents</strong>
        </span>
        <span className="shell-topbar-actions">
          <ThemeToggleButton />
          <Link to="/teams">View teams</Link>
          <Link to="/login">Sign in</Link>
        </span>
      </header>

      {error && <p className="error">{error}</p>}
      {!players && !error && <p>Loading…</p>}

      {players && (
        <div className="stat-tile-row">
          <StatTile icon={<UsersIcon />} label="Free agents" value={players.length} />
        </div>
      )}

      <section className="card">
        <FreeAgentsTable players={players ?? []} label="Current Free Agents" defaultOpen />
      </section>
    </div>
  );
}
