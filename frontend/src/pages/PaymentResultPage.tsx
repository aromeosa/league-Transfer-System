import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Payment } from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { HomeIcon, TransferIcon, UsersIcon } from '../components/icons';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30s — PayFast's ITN usually arrives within a few seconds

export function PaymentResultPage() {
  const { user, token, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const outcome = searchParams.get('outcome');

  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (outcome !== 'success' || !requestId) return;
    let cancelled = false;
    let count = 0;

    async function poll() {
      try {
        const result = await api.get<Payment | null>(`/transfer-requests/${requestId}/payment`, token);
        if (!cancelled) setPayment(result);
        return result;
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to check payment status');
        return null;
      }
    }

    poll();
    const interval = setInterval(async () => {
      count += 1;
      setPollCount(count);
      const result = await poll();
      const isTerminal = result?.status === 'CONFIRMED' || result?.status === 'FAILED';
      if (isTerminal || count >= MAX_POLLS) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [outcome, requestId, token]);

  const navItems = [
    { label: 'Dashboard', path: '/team', icon: <HomeIcon /> },
    { label: 'League Teams', path: '/teams', icon: <UsersIcon /> },
    { label: 'How Transfers Work', path: '/how-it-works', icon: <TransferIcon /> },
  ];

  return (
    <DashboardShell title="Payment" userName={user?.name} onLogout={logout} navItems={navItems}>
      <section className="card">
        <h2>Payment</h2>

        {outcome === 'cancelled' && (
          <p className="banner banner-bad">
            Payment was cancelled — the transfer request is still awaiting payment, and you can try again from your
            dashboard.
          </p>
        )}

        {outcome === 'success' && (
          <>
            {error && <p className="error">{error}</p>}
            {!payment || payment.status === 'INITIATED' ? (
              <p className="banner banner-good">
                {pollCount >= MAX_POLLS
                  ? "Still waiting on confirmation from the payment gateway — this can take a little longer than usual. Check your dashboard shortly; it'll update once confirmed."
                  : 'Payment received by the gateway — waiting for confirmation…'}
              </p>
            ) : payment.status === 'CONFIRMED' ? (
              <p className="banner banner-good">
                Payment confirmed! This transfer now moves to League Admin for final approval.
              </p>
            ) : (
              <p className="banner banner-bad">
                The gateway reported this payment as failed. No charge should have gone through — you can try again
                from your dashboard.
              </p>
            )}
          </>
        )}

        {!outcome && <p className="muted">No payment outcome to show.</p>}

        <p className="muted">
          <Link to="/team">Back to dashboard</Link>
        </p>
      </section>
    </DashboardShell>
  );
}
