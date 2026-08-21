import type { Player } from '../types';
import { PlayerNameCell } from './PlayerNameCell';
import { CollapsibleList } from './CollapsibleList';

export function FreeAgentsTable({
  players,
  label = 'Free Agents',
  defaultOpen = false,
}: {
  players: Player[];
  label?: string;
  defaultOpen?: boolean;
}) {
  return (
    <CollapsibleList label={label} items={players} getName={(p) => p.name} defaultOpen={defaultOpen}>
      {(filtered) => (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Position</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <PlayerNameCell player={p} />
                </td>
                <td>{p.position ?? '—'}</td>
                <td>{p.location ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CollapsibleList>
  );
}
