import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

/**
 * Reached from the registration-confirmation email — requires an explicit click rather
 * than confirming on page load, since some email clients pre-fetch links and would
 * otherwise confirm the registration before the player ever opens the message.
 */
export function ConfirmPlayerRegistrationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [result, setResult] = useState<{ playerName: string; teamName: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ playerName: string; teamName: string | null }>('/players/confirm-registration', {
        token,
      });
      setResult(res);
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
        <h1>Confirm your registration</h1>
        {!token ? (
          <p className="error">This confirmation link is missing its token.</p>
        ) : result ? (
          <p className="banner banner-good">
            You're confirmed on {result.teamName ?? 'the team'}'s roster, {result.playerName}. You can close this
            page.
          </p>
        ) : (
          <>
            <p className="muted">
              A team has registered you as a player on their 5quadLeague roster. Confirm below to accept.
            </p>
            {error && <p className="error">{error}</p>}
            <button onClick={confirm} disabled={submitting}>
              {submitting ? 'Confirming…' : 'Confirm my registration'}
            </button>
          </>
        )}
        <p className="muted">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
