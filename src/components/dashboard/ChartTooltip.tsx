import { CHART_FONT_MONO } from './chartTheme';

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadEntry[];
}

/** Replaces recharts' default white tooltip card with one built from the
 *  shell tokens (panel bg, rule border, mono numbers) — the default reads
 *  as a charting-library demo dropped onto a dark instrument. */
export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded border border-shell-600 bg-shell-800 px-2 py-1.5 text-scale-1"
      style={{ fontFamily: CHART_FONT_MONO }}
    >
      {label !== undefined && <div className="mb-1 text-steel-400">{label}</div>}
      {payload.map((entry, i) => (
        <div key={`${entry.name}-${i}`} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-steel-300">{entry.name}</span>
          <span className="ml-auto text-steel-200">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
