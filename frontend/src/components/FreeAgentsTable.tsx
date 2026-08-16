import type { Player } from '../types';
import { PlayerNameCell } from './PlayerNameCell';

export function FreeAgentsTable({ players }: { players: Player[] }) {
  if (players.length === 0) return <p className="muted">No free agents registered yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Position</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr key={p.id}>
            <td>
              <PlayerNameCell player={p} />
            </td>
            <td>{p.position ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
