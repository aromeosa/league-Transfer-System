import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function Topbar({ title }: { title: string }) {
  return (
    <div className="shell-topbar">
      <h1>{title}</h1>
      <div className="shell-topbar-actions">
        <ThemeToggleButton />
      </div>
    </div>
  );
}
