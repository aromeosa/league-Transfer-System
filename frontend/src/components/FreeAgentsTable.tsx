import type { Player } from '../types';
import { PlayerNameCell } from './PlayerNameCell';
import { CollapsibleList } from './CollapsibleList';

export function FreeAgentsTable({ players, label = 'Free Agents' }: { players: Player[]; label?: string }) {
  return (
    <CollapsibleList label={label} items={players} getName={(p) => p.name}>
      {(filtered) => (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <PlayerNameCell player={p} />
                </td>
                <td>{p.position ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CollapsibleList>
  );
}
