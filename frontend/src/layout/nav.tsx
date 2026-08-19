import type { NavItem } from './Sidebar';
import { ClockIcon, HomeIcon, TableIcon, TransferIcon, UserIcon, UsersIcon } from '../components/icons';
import type { CurrentUser } from '../types';

export const TEAM_OWNER_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/team', icon: <HomeIcon /> },
  { label: 'League Teams', path: '/teams', icon: <UsersIcon /> },
  { label: 'Free Agents', path: '/free-agents', icon: <UsersIcon /> },
  { label: 'Legacy Pool', path: '/legacy-pool', icon: <UsersIcon /> },
  { label: 'How Transfers Work', path: '/how-it-works', icon: <TransferIcon /> },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <HomeIcon /> },
  { label: 'Teams & Rosters', path: '/admin/teams', icon: <TableIcon /> },
  { label: 'All Events', path: '/admin/events', icon: <ClockIcon /> },
];

export const LEGACY_TEAM_OWNER_NAV: NavItem[] = [{ label: 'Dashboard', path: '/legacy-team', icon: <HomeIcon /> }];

export function getFreeAgentNav(loggedIn: boolean): NavItem[] {
  return [
    ...(loggedIn ? [{ label: 'Dashboard', path: '/free-agent', icon: <HomeIcon /> }] : []),
    { label: 'Free Agents', path: '/free-agents', icon: <UsersIcon /> },
    ...(loggedIn ? [] : [{ label: 'Sign up', path: '/register-free-agent', icon: <UserIcon /> }]),
    { label: 'View Teams', path: '/teams', icon: <TableIcon /> },
  ];
}

/** Used by pages reachable by more than one role (e.g. the public /teams and
 * /free-agents directories), so the sidebar always matches the visitor's own
 * account instead of defaulting to the free-agent nav. */
export function getNavForUser(user: CurrentUser | null): NavItem[] {
  switch (user?.role) {
    case 'TEAM_OWNER':
      return TEAM_OWNER_NAV;
    case 'LEAGUE_ADMIN':
      return ADMIN_NAV;
    case 'LEGACY_TEAM_OWNER':
      return LEGACY_TEAM_OWNER_NAV;
    case 'FREE_AGENT':
      return getFreeAgentNav(true);
    default:
      return getFreeAgentNav(false);
  }
}
