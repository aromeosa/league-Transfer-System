import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '../types';

export function RequireAuth({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={user.role === 'LEAGUE_ADMIN' ? '/admin' : '/team'} replace />;
  }
  return <>{children}</>;
}
