import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../api/client';

// Mirrors the backend's roster size constraint (§4.2 / BusinessRules.ROSTER_MIN/MAX).
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 15;

// Mirrors the backend's valuation range (§1.3 / BusinessRules.VALUATION_MIN/MAX).
const VALUE_MIN = 500;
const VALUE_MAX = 5000;

interface PlayerRow {
  name: string;
  value: string;
  idNumber: string;
}

function emptyRoster(): PlayerRow[] {
  return Array.from({ length: MIN_PLAYERS }, () => ({ name: '', value: '', idNumber: '' }));
}

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
  const [players, setPlayers] = useState<PlayerRow[]>(emptyRoster);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addPlayer() {
    setPlayers((rows) => (rows.length >= MAX_PLAYERS ? rows : [...rows, { name: '', value: '', idNumber: '' }]));
  }

  function removePlayer(index: number) {
    setPlayers((rows) => (rows.length <= MIN_PLAYERS ? rows : rows.filter((_, i) => i !== index)));
  }

  function updatePlayer(index: number, field: keyof PlayerRow, fieldValue: string) {
    setPlayers((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: fieldValue } : row)));
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
          players: players
            .filter((p) => p.name.trim())
            .map((p) => ({
              name: p.name,
              transferValue: p.value ? Number(p.value) : undefined,
              idNumber: p.idNumber.trim() || undefined,
            })),
        },
        token,
      );
      setName('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setPlayers(emptyRoster());
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
            Initial roster ({players.length}/{MAX_PLAYERS}, {MIN_PLAYERS}&ndash;{MAX_PLAYERS} players)
          </legend>
          <p className="muted">
            Set each player's transfer value (R{VALUE_MIN}&ndash;R{VALUE_MAX}). Once your team is active, values can
            only be changed while a transfer window is open. ID/passport number is optional — used only to confirm
            a player isn't already registered under another name; never shown to anyone, not even a League Admin.
          </p>
          {players.map((row, i) => (
            <div className="player-row" key={i}>
              <input
                value={row.name}
                placeholder={`Player ${i + 1} name`}
                onChange={(e) => updatePlayer(i, 'name', e.target.value)}
                required
              />
              <input
                type="number"
                className="player-value-input"
                value={row.value}
                placeholder="Value"
                min={VALUE_MIN}
                max={VALUE_MAX}
                onChange={(e) => updatePlayer(i, 'value', e.target.value)}
                required
              />
              <input
                className="player-value-input"
                value={row.idNumber}
                placeholder="ID/passport (optional)"
                minLength={4}
                onChange={(e) => updatePlayer(i, 'idNumber', e.target.value)}
              />
              <button
                type="button"
                className="remove-player-btn"
                onClick={() => removePlayer(i)}
                disabled={players.length <= MIN_PLAYERS}
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
            disabled={players.length >= MAX_PLAYERS}
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
