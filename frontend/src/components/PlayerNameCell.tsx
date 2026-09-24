import { useState } from 'react';
import type { Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerStatusBadge } from './PlayerStatusBadge';
import { PencilIcon } from './icons';

/** Avatar + name + status badge, used wherever a player is listed outside their own
 * team owner's editable roster. Pass `onRename` (League Admin views only) to let the
 * name itself be edited inline. */
export function PlayerNameCell({
  player,
  onRename,
}: {
  player: Player;
  onRename?: (player: Player, name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <span className="player-name-cell">
        <span className="player-avatar-wrap">
          <PlayerAvatar avatarUrl={player.avatarUrl} />
        </span>
        <form
          className="inline-form"
          style={{ display: 'inline-flex', gap: '0.4rem' }}
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || trimmed === player.name) {
              setEditing(false);
              setName(player.name);
              return;
            }
            setBusy(true);
            setError(null);
            try {
              await onRename!(player, trimmed);
              setEditing(false);
            } catch {
              setError('Failed to rename player');
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            style={{ width: '10rem' }}
          />
          <button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setName(player.name);
              setError(null);
            }}
          >
            Cancel
          </button>
        </form>
        {error && <span className="error">{error}</span>}
      </span>
    );
  }

  return (
    <span className="player-name-cell">
      <span className="player-avatar-wrap">
        <PlayerAvatar avatarUrl={player.avatarUrl} />
      </span>
      <span>{player.name}</span>
      <PlayerStatusBadge status={player.status} />
      {onRename && (
        <button
          type="button"
          className="icon-button"
          aria-label={`Rename ${player.name}`}
          onClick={() => setEditing(true)}
        >
          <PencilIcon width={14} height={14} />
        </button>
      )}
    </span>
  );
}
