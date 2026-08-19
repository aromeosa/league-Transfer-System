import { UsersIcon } from './icons';

/** Shared logo-or-placeholder rendering, used by both the editable (Team Owner) and read-only (public/admin) team cells. */
export function TeamLogo({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="team-logo" />;
  }
  return (
    <span className="team-logo-placeholder">
      <UsersIcon />
    </span>
  );
}
