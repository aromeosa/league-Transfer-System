import { Fragment, useState } from 'react';
import type { TransferRequest } from '../types';
import { StatusBadge } from './StatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentTimeline } from './PaymentTimeline';

export function RequestTable({ requests }: { requests: TransferRequest[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (requests.length === 0) return <p className="muted">No transfer requests yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Type</th>
          <th>From</th>
          <th>To</th>
          <th>Fee</th>
          <th>Payment</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <Fragment key={r.id}>
            <tr>
              <td>{r.player.name}</td>
              <td>{r.requestType}</td>
              <td>{r.releasingTeam?.name ?? '—'}</td>
              <td>{r.requestingTeam.name}</td>
              <td>R{r.agreedFee}</td>
              <td>
                <PaymentStatusBadge payment={r.payment} />
                {r.payment && (
                  <button type="button" className="btn-small" onClick={() => toggle(r.id)}>
                    {expandedIds.has(r.id) ? 'Hide timeline' : 'Show timeline'}
                  </button>
                )}
              </td>
              <td>
                <StatusBadge status={r.status} />
              </td>
            </tr>
            {expandedIds.has(r.id) && (
              <tr>
                <td colSpan={7}>
                  <PaymentTimeline requestId={r.id} payment={r.payment} canManage={false} token={null} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
