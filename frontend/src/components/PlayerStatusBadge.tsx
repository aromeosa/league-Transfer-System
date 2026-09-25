import type { PlayerStatus } from '../types';

const LABELS: Record<PlayerStatus, string> = {
  FREE_AGENT: 'Free Agent',
  REGISTERED: 'Registered',
  LEGACY: 'Legacy',
  PENDING_APPROVAL: 'Pending',
};

const TONE: Record<PlayerStatus, 'good' | 'info' | 'legacy' | 'pending'> = {
  FREE_AGENT: 'good',
  REGISTERED: 'info',
  LEGACY: 'legacy',
  PENDING_APPROVAL: 'pending',
};

export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  return <span className={`badge badge-${TONE[status]}`}>{LABELS[status]}</span>;
}
