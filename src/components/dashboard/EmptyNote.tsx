import type { ReactNode } from 'react';

interface EmptyNoteProps {
  children: ReactNode;
}

/** An honest "nothing here" state for one chart/list within a section —
 *  distinct from DashboardScreen's top-level empty state (zero sessions in
 *  range at all): a section can be legitimately empty (e.g. no coverage
 *  gaps this range) while the rest of the dashboard has real data, and
 *  that must not render as a blank or broken chart. */
export function EmptyNote({ children }: EmptyNoteProps) {
  return <p className="px-2 py-6 text-center text-scale-2 text-steel-400">{children}</p>;
}
