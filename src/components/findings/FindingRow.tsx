import { useEffect, useRef } from 'react';
import type { Signal } from '../../types/screening';
import { SeverityChip } from './SeverityChip';

interface FindingRowProps {
  signal: Signal;
  onSelect?: (signal: Signal) => void;
  /** Rendered indented, as a member beneath a convergence group row. */
  nested?: boolean;
  /** Set when the MRZ ribbon (or other evidence UI) selected this signal —
   *  scrolls into view and highlights, reversing the finding->canvas
   *  direction of onSelect. */
  highlighted?: boolean;
}

/** A row without a region is still clickable, but shows "no location"
 *  instead of a focus affordance — the caller (LaneScreen) is responsible
 *  for not driving DocumentCanvas focus for these rows. */
export function FindingRow({ signal, onSelect, nested = false, highlighted = false }: FindingRowProps) {
  const hasRegion = Boolean(signal.region);
  const ref = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted]);

  return (
    <li ref={ref} className={highlighted ? 'ring-1 ring-inset ring-hold' : undefined}>
      <button
        type="button"
        onClick={() => onSelect?.(signal)}
        className={`group flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-scale-3 hover:bg-shell-700 ${
          nested ? 'pl-8' : ''
        }`}
      >
        {/* group-hover:text-steel-300, not -400: hover turns this row's
            background --shell-700, where --steel-400 fails contrast. */}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="text-steel-400 group-hover:text-steel-300">
              ▸
            </span>
            <SeverityChip severity={signal.severity} />
            <span className="truncate text-steel-200">{signal.detail}</span>
            {!hasRegion && (
              <span className="shrink-0 text-scale-1 text-steel-400 group-hover:text-steel-300">no location</span>
            )}
          </span>
          <span className="pl-6 font-mono text-scale-1 text-steel-400">{signal.code}</span>
        </span>
        <span className="shrink-0 font-mono text-steel-200">
          {signal.weight > 0 ? `+${signal.weight}` : signal.weight}
        </span>
      </button>
    </li>
  );
}
