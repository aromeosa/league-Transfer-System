import { LogOutIcon } from '../components/icons';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function Topbar({
  title,
  userName,
  onLogout,
}: {
  title: string;
  userName?: string;
  onLogout: () => void;
}) {
  return (
    <div className="shell-topbar">
      <h1>{title}</h1>
      <div className="shell-topbar-actions">
        {userName && (
          <span className="user-chip">
            <strong>{userName}</strong>
          </span>
        )}
        <ThemeToggleButton />
        <button type="button" className="icon-btn" onClick={onLogout} aria-label="Sign out">
          <LogOutIcon />
        </button>
      </div>
    </div>
  );
}
