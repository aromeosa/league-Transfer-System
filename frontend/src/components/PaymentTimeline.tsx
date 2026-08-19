import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Payment } from '../types';

/**
 * 3-step settlement timeline for a single payment: the team's payment to the league
 * (automatic, tracked by the gateway), then the League Admin's own attestation that
 * they've forwarded the club's bundled settlement, then the player's entitlement
 * within it. Steps 2/3 never move money themselves — see Payment entity — they're the
 * admin manually checking off that they did it outside the system. Read-only unless
 * canManage is set.
 */
export function PaymentTimeline({
  requestId,
  payment,
  canManage,
  token,
  onUpdated,
}: {
  requestId: string;
  payment?: Payment | null;
  canManage: boolean;
  token: string | null;
  onUpdated?: () => void;
}) {
  const [busyStep, setBusyStep] = useState<'club' | 'player' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!payment) {
    return <p className="muted">No payment yet.</p>;
  }

  const receivedDone = payment.status === 'CONFIRMED';
  const clubDone = !!payment.clubPaidAt;
  const playerDone = !!payment.playerPaidAt;

  async function markPaid(step: 'club' | 'player') {
    setBusyStep(step);
    setError(null);
    try {
      await api.post(`/transfer-requests/${requestId}/payment/mark-${step}-paid`, {}, token);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to mark ${step} as paid`);
    } finally {
      setBusyStep(null);
    }
  }

  const steps: {
    key: 'received' | 'club' | 'player';
    label: string;
    done: boolean;
    at?: string | null;
    actionable: boolean;
  }[] = [
    {
      key: 'received',
      label: 'Payment received for player',
      done: receivedDone,
      at: payment.confirmedAt,
      actionable: false,
    },
    {
      key: 'club',
      label: 'Payment to club',
      done: clubDone,
      at: payment.clubPaidAt,
      actionable: canManage && receivedDone && !clubDone,
    },
    {
      key: 'player',
      label: 'Payment to player',
      done: playerDone,
      at: payment.playerPaidAt,
      actionable: canManage && clubDone && !playerDone,
    },
  ];

  return (
    <div className="payment-timeline">
      {steps.map((step, i) => (
        <div className="payment-timeline-step" key={step.key}>
          <div className="payment-timeline-marker-col">
            <span className={`payment-timeline-marker${step.done ? ' done' : ''}`}>{step.done ? '✓' : i + 1}</span>
            {i < steps.length - 1 && <span className={`payment-timeline-connector${step.done ? ' done' : ''}`} />}
          </div>
          <div className="payment-timeline-body">
            <span className="payment-timeline-label">{step.label}</span>
            {step.at && (
              <span className="muted payment-timeline-at">{new Date(step.at).toLocaleString()}</span>
            )}
            {step.actionable && step.key !== 'received' && (
              <button
                type="button"
                className="btn-small"
                disabled={busyStep === step.key}
                onClick={() => markPaid(step.key as 'club' | 'player')}
              >
                {busyStep === step.key ? 'Marking…' : 'Mark as paid'}
              </button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
