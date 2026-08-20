import type { PlayerStatus } from '../types';

const LABELS: Record<PlayerStatus, string> = {
  FREE_AGENT: 'Free Agent',
  REGISTERED: 'Registered',
  LEGACY: 'Legacy',
};

const TONE: Record<PlayerStatus, 'good' | 'info' | 'legacy'> = {
  FREE_AGENT: 'good',
  REGISTERED: 'info',
  LEGACY: 'legacy',
};

export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  return <span className={`badge badge-${TONE[status]}`}>{LABELS[status]}</span>;
}
