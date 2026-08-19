import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOutIcon } from '../components/icons';
import { Logo } from '../components/Logo';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

export function Sidebar({
  navItems,
  userName,
  onLogout,
}: {
  navItems: NavItem[];
  userName?: string;
  onLogout: () => void;
}) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <Logo className="sidebar-brand" />
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link${location.pathname === item.path ? ' active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        {userName && <span className="user-chip">{userName}</span>}
        <button type="button" className="sidebar-link sidebar-logout" onClick={onLogout}>
          <LogOutIcon />
          Sign out
        </button>
      </div>
    </aside>
  );
}
