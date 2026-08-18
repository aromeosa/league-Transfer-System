import type { RequestStatus } from '../types';

const LABELS: Record<RequestStatus, string> = {
  PENDING_RELEASING_APPROVAL: 'Awaiting releasing team',
  PENDING_PLAYER_APPROVAL: 'Awaiting Free Agent',
  PENDING_TEAM_APPROVAL: 'Awaiting approached team',
  PENDING_PAYMENT: 'Awaiting payment',
  PENDING_LEAGUE_APPROVAL: 'Awaiting League Admin',
  APPROVED: 'Approved',
  REJECTED_BY_RELEASING_TEAM: 'Rejected by releasing team',
  REJECTED_BY_PLAYER: 'Rejected by Free Agent',
  REJECTED_BY_REQUESTING_TEAM: 'Rejected by approached team',
  REJECTED_BY_LEAGUE_ADMIN: 'Rejected by League Admin',
  CANCELLED_WINDOW_CLOSED: 'Cancelled — window closed',
  CANCELLED_PLAYER_UNAVAILABLE: 'Cancelled — player no longer available',
};

const TONE: Record<RequestStatus, 'pending' | 'good' | 'bad'> = {
  PENDING_RELEASING_APPROVAL: 'pending',
  PENDING_PLAYER_APPROVAL: 'pending',
  PENDING_TEAM_APPROVAL: 'pending',
  PENDING_PAYMENT: 'pending',
  PENDING_LEAGUE_APPROVAL: 'pending',
  APPROVED: 'good',
  REJECTED_BY_RELEASING_TEAM: 'bad',
  REJECTED_BY_PLAYER: 'bad',
  REJECTED_BY_REQUESTING_TEAM: 'bad',
  REJECTED_BY_LEAGUE_ADMIN: 'bad',
  CANCELLED_WINDOW_CLOSED: 'bad',
  CANCELLED_PLAYER_UNAVAILABLE: 'bad',
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge badge-${TONE[status]}`}>{LABELS[status]}</span>;
}
