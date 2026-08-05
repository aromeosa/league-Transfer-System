import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardShell({
  navItems,
  title,
  userName,
  onLogout,
  children,
}: {
  navItems: NavItem[];
  title: string;
  userName?: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <Sidebar navItems={navItems} />
      <main className="shell-main">
        <Topbar title={title} userName={userName} onLogout={onLogout} />
        {children}
      </main>
    </div>
  );
}
