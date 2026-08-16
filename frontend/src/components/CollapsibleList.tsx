import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from './icons';

/**
 * Collapsed by default — long name lists (rosters, free agents) start hidden behind a
 * toggle instead of dumping every row on the page, with a search box (by name) once
 * opened.
 */
export function CollapsibleList<T>({
  label,
  items,
  getName,
  defaultOpen = false,
  children,
}: {
  label: string;
  items: T[];
  getName: (item: T) => string;
  defaultOpen?: boolean;
  children: (filtered: T[]) => ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => getName(item).toLowerCase().includes(q)) : items;
  }, [items, query, getName]);

  return (
    <div className="collapsible-list">
      <button type="button" className="collapsible-list-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          {label} ({items.length})
        </span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="collapsible-list-body">
          {items.length === 0 ? (
            <p className="muted">Nothing to show.</p>
          ) : (
            <>
              <input
                type="text"
                className="collapsible-list-search"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {filtered.length === 0 ? (
                <p className="muted">No matches for &ldquo;{query}&rdquo;.</p>
              ) : (
                children(filtered)
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
