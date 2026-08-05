import type { ReactNode } from 'react';

export function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon">{icon}</div>
      <div>
        <div className="stat-tile-label">{label}</div>
        <div className="stat-tile-value">{value}</div>
      </div>
    </div>
  );
}
