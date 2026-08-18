import type { Payment } from '../types';

const LABELS: Record<Payment['status'], string> = {
  INITIATED: 'Processing',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
};

const TONE: Record<Payment['status'], 'pending' | 'good' | 'bad'> = {
  INITIATED: 'pending',
  CONFIRMED: 'good',
  FAILED: 'bad',
};

/** Shows the underlying Payment's own status, separate from the transfer request's
 * overall status — e.g. a request can already read "Awaiting League Admin" while this
 * still spells out that the payment itself was Confirmed. */
export function PaymentStatusBadge({ payment }: { payment?: Payment | null }) {
  if (!payment) return <span className="muted">—</span>;
  return <span className={`badge badge-${TONE[payment.status]}`}>{LABELS[payment.status]}</span>;
}
