import type { TransferRequest } from '../types';
import { StatusBadge } from './StatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export function RequestTable({ requests }: { requests: TransferRequest[] }) {
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
          <tr key={r.id}>
            <td>{r.player.name}</td>
            <td>{r.requestType}</td>
            <td>{r.releasingTeam?.name ?? '—'}</td>
            <td>{r.requestingTeam.name}</td>
            <td>R{r.agreedFee}</td>
            <td>
              <PaymentStatusBadge payment={r.payment} />
            </td>
            <td>
              <StatusBadge status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
