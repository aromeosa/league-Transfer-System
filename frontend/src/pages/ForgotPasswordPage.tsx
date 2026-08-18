import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
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
        <h1>Forgot your password?</h1>
        {submitted ? (
          <>
            <p className="banner banner-good">
              If an account exists for that email, we've sent a link to reset your password.
            </p>
            <p className="muted">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">Enter the email on your account and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="stacked-form">
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="muted">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
