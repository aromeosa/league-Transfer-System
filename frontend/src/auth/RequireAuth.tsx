import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '../types';

const HOME_PATH: Record<UserRole, string> = {
  LEAGUE_ADMIN: '/admin',
  TEAM_OWNER: '/team',
  FREE_AGENT: '/free-agent',
};

export function RequireAuth({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={HOME_PATH[user.role]} replace />;
  }
  return <>{children}</>;
}
