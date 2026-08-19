import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Player } from '../types';
import { StatTile } from '../components/StatTile';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { DashboardShell } from '../layout/DashboardShell';
import { UsersIcon } from '../components/icons';
import { getNavForUser } from '../layout/nav';
import { useAuth } from '../auth/AuthContext';

export function FreeAgentsPage() {
  const { user, logout } = useAuth();
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
    <DashboardShell
      title="Free Agents"
      navItems={getNavForUser(user)}
      userName={user?.name}
      onLogout={user ? logout : undefined}
    >
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
    </DashboardShell>
  );
}
