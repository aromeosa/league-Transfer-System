import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { PlayerPosition } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { FREE_AGENT_PUBLIC_NAV } from './FreeAgentsPage';
import { useAuth } from '../auth/AuthContext';

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GK', label: 'Goalkeeper (GK)' },
  { value: 'DF', label: 'Defender (DF)' },
  { value: 'MD', label: 'Midfielder (MD)' },
  { value: 'ST', label: 'Striker (ST)' },
];

export function FreeAgentRegisterPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PlayerPosition | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!position) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/players/free-agents', {
        name,
        position,
        email,
        password,
        ...(idNumber ? { idNumber } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to sign up');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell
      title="Sign up as a Free Agent"
      navItems={FREE_AGENT_PUBLIC_NAV}
      userName={user?.name}
      onLogout={user ? logout : undefined}
    >
      <section className="card" style={{ maxWidth: 480 }}>
        {submitted ? (
          <>
            <p className="banner banner-good">
              You're signed up — you now appear in the Free Agents pool, and any team can sign you during a transfer
              window.
            </p>
            <Link to="/login">Sign in</Link>
            <p className="muted">
              <Link to="/free-agents">View the Free Agents pool</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              Add yourself to the pool so any team can sign you during a transfer window. You'll also get an
              account — when a team wants to sign you, you decide whether to accept before it goes to the League
              Admin.
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
              <label>
                ID/passport number (optional)
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} minLength={4} />
              </label>
              <p className="muted">
                Used only to confirm you're not already registered under another name — never shown to anyone, not
                even a League Admin.
              </p>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Signing up…' : 'Sign up'}
              </button>
            </form>
            {error && <p className="error">{error}</p>}
            <p className="muted">
              Already signed up? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
