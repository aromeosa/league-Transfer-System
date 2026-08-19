import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeamRegistrationForm } from '../components/TeamRegistrationForm';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function TeamRegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="centered-page">
      <ThemeToggleButton className="theme-toggle-corner" />
      <div className="card" style={{ maxWidth: 720 }}>
        <h1>Register your team</h1>
        {submitted ? (
          <>
            <p className="banner banner-good">
              Registration submitted — your team is pending League Admin approval. You can sign in once it's
              approved.
            </p>
            <Link to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">
              Registering here puts your team in a pending queue for League Admin approval — it won't be active
              until then.
            </p>
            <TeamRegistrationForm
              endpoint="/teams/register"
              submitLabel="Register team"
              onSuccess={() => setSubmitted(true)}
            />
            <p className="muted">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
