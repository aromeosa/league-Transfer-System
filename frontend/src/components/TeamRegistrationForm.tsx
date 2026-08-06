import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../api/client';

// Mirrors the backend's roster size constraint (§4.2 / BusinessRules.ROSTER_MIN/MAX).
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 15;

/**
 * Shared by the League Admin's direct-create flow (POST /teams, immediately ACTIVE)
 * and the public self-registration page (POST /teams/register, PENDING_APPROVAL) —
 * same fields, same validation, different endpoint/auth and what happens on success.
 */
export function TeamRegistrationForm({
  endpoint,
  token,
  submitLabel,
  onSuccess,
}: {
  endpoint: '/teams' | '/teams/register';
  token?: string | null;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [playerNames, setPlayerNames] = useState(Array(MIN_PLAYERS).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addPlayer() {
    setPlayerNames((names) => (names.length >= MAX_PLAYERS ? names : [...names, '']));
  }

  function removePlayer(index: number) {
    setPlayerNames((names) => (names.length <= MIN_PLAYERS ? names : names.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        endpoint,
        {
          name,
          owner: { name: ownerName, email: ownerEmail, password: ownerPassword },
          players: playerNames.filter((n) => n.trim()).map((n) => ({ name: n })),
        },
        token,
      );
      setName('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setPlayerNames(Array(MIN_PLAYERS).fill(''));
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to register team');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="stacked-form">
        <label>
          Team name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Owner name
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        </label>
        <label>
          Owner email
          <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
        </label>
        <label>
          Owner password
          <input
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <fieldset>
          <legend>
            Initial roster ({playerNames.length}/{MAX_PLAYERS}, {MIN_PLAYERS}&ndash;{MAX_PLAYERS} players)
          </legend>
          {playerNames.map((value, i) => (
            <div className="player-row" key={i}>
              <input
                value={value}
                placeholder={`Player ${i + 1} name`}
                onChange={(e) => {
                  const next = [...playerNames];
                  next[i] = e.target.value;
                  setPlayerNames(next);
                }}
                required
              />
              <button
                type="button"
                className="remove-player-btn"
                onClick={() => removePlayer(i)}
                disabled={playerNames.length <= MIN_PLAYERS}
                aria-label={`Remove player ${i + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={addPlayer}
            disabled={playerNames.length >= MAX_PLAYERS}
          >
            + Add player
          </button>
        </fieldset>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </>
  );
}
