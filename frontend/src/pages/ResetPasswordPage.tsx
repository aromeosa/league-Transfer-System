import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-page">
      <ThemeToggleButton className="theme-toggle-corner" />
      <div className="card" style={{ maxWidth: 420 }}>
        <h1>Reset your password</h1>
        {!token ? (
          <>
            <p className="error">This reset link is missing its token.</p>
            <p className="muted">
              <Link to="/forgot-password">Request a new link</Link>
            </p>
          </>
        ) : submitted ? (
          <p className="banner banner-good">
            Your password has been updated. <Link to="/login">Sign in</Link>
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="stacked-form">
              <label>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
            <p className="muted">
              <Link to="/forgot-password">Request a new link</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
