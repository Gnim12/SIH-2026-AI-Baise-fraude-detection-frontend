import type { Signal } from '../../types/screening';
import { buildFindingsRows } from './findingsRows';
import { FindingRow } from './FindingRow';

interface FindingsListProps {
  signals: Signal[];
  onSelectSignal?: (signal: Signal) => void;
  /** Set by MrzRibbon group clicks — scrolls to and highlights the row. */
  highlightedSignalId?: string | null;
}

export function FindingsList({ signals, onSelectSignal, highlightedSignalId = null }: FindingsListProps) {
  const rows = buildFindingsRows(signals);

  if (rows.length === 0) {
    return <p className="px-2 py-1.5 text-scale-3 text-steel-400">No findings.</p>;
  }

  return (
    <ul className="divide-y divide-shell-700">
      {rows.map((row) =>
        row.kind === 'single' ? (
          <FindingRow
            key={row.signal.id}
            signal={row.signal}
            onSelect={onSelectSignal}
            highlighted={row.signal.id === highlightedSignalId}
          />
        ) : (
          <li key={row.groupId} className="border-l-4 border-hold">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="rounded bg-hold/20 px-1.5 py-0.5 text-scale-2 text-hold">
                {row.members.length} modules agree on this region
              </span>
            </div>
            <ul>
              {row.members.map((signal) => (
                <FindingRow
                  key={signal.id}
                  signal={signal}
                  onSelect={onSelectSignal}
                  nested
                  highlighted={signal.id === highlightedSignalId}
                />
              ))}
            </ul>
          </li>
        ),
      )}
    </ul>
  );
}
