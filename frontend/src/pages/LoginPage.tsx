import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { Logo } from '../components/Logo';
import { HOME_PATH } from '../auth/RequireAuth';

export function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={HOME_PATH[user.role]} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-page">
      <ThemeToggleButton className="theme-toggle-corner" />
      <form className="card" onSubmit={handleSubmit}>
        <Logo className="auth-logo" />
        <p className="muted">Transfer System — sign in as a Team Owner, Free Agent, or League Admin.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <p className="muted" style={{ marginTop: '-0.5rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted">
          New team? <Link to="/register">Register a new team</Link>
        </p>
        <p className="muted">
          Free agent? <Link to="/free-agents">Sign up here</Link>
        </p>
        <p className="muted">
          <Link to="/teams">View league teams</Link>
        </p>
      </form>
    </div>
  );
}
