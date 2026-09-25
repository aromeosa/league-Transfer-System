import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { TeamLogo } from './TeamLogo';
import { CameraIcon } from './icons';
import { resizeImageToDataUrl } from '../utils/resizeImage';

// Mirrors the backend's roster size constraint (§4.2 / BusinessRules.ROSTER_MIN/MAX).
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 15;

interface PlayerRow {
  name: string;
  value: string;
  idNumber: string;
  email: string;
}

function emptyRoster(): PlayerRow[] {
  return Array.from({ length: MIN_PLAYERS }, () => ({ name: '', value: '', idNumber: '', email: '' }));
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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [players, setPlayers] = useState<PlayerRow[]>(emptyRoster);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    try {
      setLogoDataUrl(await resizeImageToDataUrl(file));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Failed to load image');
    }
  }

  function addPlayer() {
    setPlayers((rows) =>
      rows.length >= MAX_PLAYERS ? rows : [...rows, { name: '', value: '', idNumber: '', email: '' }],
    );
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
          ...(logoDataUrl ? { logoDataUrl } : {}),
          owner: { name: ownerName, email: ownerEmail, password: ownerPassword },
          players: players
            .filter((p) => p.name.trim())
            .map((p) => ({
              name: p.name,
              email: p.email.trim(),
              transferValue: p.value ? Number(p.value) : undefined,
              idNumber: p.idNumber.trim() || undefined,
            })),
        },
        token,
      );
      setName('');
      setLogoDataUrl(null);
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
        <span>
          Team logo (optional)
          <span className="team-logo-picker">
            <button
              type="button"
              className="team-logo-wrap editable"
              onClick={() => logoInputRef.current?.click()}
              aria-label="Upload a team logo"
              title="Upload a team logo"
            >
              <TeamLogo logoUrl={logoDataUrl} />
              <span className="team-logo-badge">
                <CameraIcon />
              </span>
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoFile} />
            <button type="button" className="btn-secondary" onClick={() => logoInputRef.current?.click()}>
              {logoDataUrl ? 'Change logo' : 'Upload logo'}
            </button>
          </span>
          {logoError && <p className="error">{logoError}</p>}
        </span>
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
            Set each player's transfer value — you can change it anytime, no transfer window needed. Each player gets
            an email asking them to confirm — they only count as registered once they accept. ID/passport number is
            optional — used only to confirm a player isn't already registered under another name; never shown to
            anyone, not even a League Admin.
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
                type="email"
                value={row.email}
                placeholder="Player email"
                onChange={(e) => updatePlayer(i, 'email', e.target.value)}
                required
              />
              <input
                type="number"
                className="player-value-input"
                value={row.value}
                placeholder="Value"
                min={0}
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
