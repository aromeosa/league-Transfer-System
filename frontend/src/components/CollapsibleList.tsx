import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from './icons';

const PAGE_SIZE = 20;

/**
 * Collapsed by default — long name lists (rosters, free agents) start hidden behind a
 * toggle instead of dumping every row on the page, with a search box (by name) once
 * opened, and pagination once the (possibly search-narrowed) list is still longer than
 * one page — otherwise a large pool has no way to navigate through it at all.
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
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => getName(item).toLowerCase().includes(q)) : items;
  }, [items, query, getName]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
                <>
                  {children(paged)}
                  {filtered.length > PAGE_SIZE && (
                    <div className="collapsible-list-pagination">
                      <button type="button" className="btn-small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                        Previous
                      </button>
                      <span className="muted">
                        Page {page + 1} of {pageCount}
                      </span>
                      <button
                        type="button"
                        className="btn-small"
                        disabled={page >= pageCount - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
