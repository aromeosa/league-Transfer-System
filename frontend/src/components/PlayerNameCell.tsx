import type { Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';

/** Read-only avatar + name, used wherever a player is listed outside their own team owner's editable roster. */
export function PlayerNameCell({ player }: { player: Player }) {
  return (
    <span className="player-name-cell">
      <span className="player-avatar-wrap">
        <PlayerAvatar avatarUrl={player.avatarUrl} />
      </span>
      <span>{player.name}</span>
    </span>
  );
}
