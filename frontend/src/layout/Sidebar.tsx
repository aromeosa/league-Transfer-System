import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

export function Sidebar({ navItems }: { navItems: NavItem[] }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        5quad<span>League</span>
      </div>
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
    </aside>
  );
}
