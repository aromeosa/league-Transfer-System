import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Player, PlayerPosition } from '../types';
import { StatTile } from '../components/StatTile';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { FreeAgentsTable } from '../components/FreeAgentsTable';
import { UsersIcon } from '../components/icons';

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GK', label: 'Goalkeeper (GK)' },
  { value: 'DF', label: 'Defender (DF)' },
  { value: 'MD', label: 'Midfielder (MD)' },
  { value: 'ST', label: 'Striker (ST)' },
];

export function FreeAgentsPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [name, setName] = useState('');
  const [position, setPosition] = useState<PlayerPosition | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
  }, [refreshKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!position) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/players/free-agents', { name, position, email, password });
      setName('');
      setPosition('');
      setEmail('');
      setPassword('');
      setSubmitted(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to sign up');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <strong>5quadLeague — Free Agents</strong>
        <span className="shell-topbar-actions">
          <ThemeToggleButton />
          <Link to="/teams">View teams</Link>
          <Link to="/login">Sign in</Link>
        </span>
      </header>

      <section className="card" style={{ maxWidth: 480 }}>
        <h2>Sign up as a Free Agent</h2>
        <p className="muted">
          Add yourself to the pool so any team can sign you during a transfer window. You'll also get an account —
          when a team wants to sign you, you decide whether to accept before it goes to the League Admin.
        </p>
        <form onSubmit={handleSubmit} className="stacked-form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Position
            <select value={position} onChange={(e) => setPosition(e.target.value as PlayerPosition)} required>
              <option value="" disabled>
                Select a position…
              </option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing up…' : 'Sign up'}
          </button>
        </form>
        {formError && <p className="error">{formError}</p>}
        {submitted && (
          <p className="banner banner-good">
            You're signed up — you now appear in the list below. <Link to="/login">Sign in</Link> to review any
            offers you receive.
          </p>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {!players && !error && <p>Loading…</p>}

      {players && (
        <div className="stat-tile-row">
          <StatTile icon={<UsersIcon />} label="Free agents" value={players.length} />
        </div>
      )}

      <section className="card">
        <FreeAgentsTable players={players ?? []} label="Current Free Agents" />
      </section>
    </div>
  );
}
