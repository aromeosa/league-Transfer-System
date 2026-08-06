import { UserIcon } from './icons';

/** Shared photo-or-placeholder rendering, used by both the editable (Team Owner) and read-only (Admin) player cells. */
export function PlayerAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="player-avatar" />;
  }
  return (
    <span className="player-avatar-placeholder">
      <UserIcon />
    </span>
  );
}
