import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BandDayBucket, DecisionPatterns } from '../../types/dashboard';
import { bandColorVar } from '../../lib/bandColors';
import { ChartTooltip } from './ChartTooltip';
import { EmptyNote } from './EmptyNote';
import { StatCallout } from './StatCallout';
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, chartLegendStyle, chartTickStyle } from './chartTheme';

// Fixed, known enums (not derived from the data) so every day's bar stacks
// in the same order and a band with zero sessions that day still reserves
// its stack segment (0-height, not absent) rather than the stacking order
// silently reshuffling day to day.
const SYSTEM_BAND_KEYS = ['CLEAR', 'SECONDARY', 'HOLD', 'ABSTAIN', 'RECAPTURE'];
const OFFICER_DECISION_KEYS = ['CLEAR', 'SECONDARY', 'HOLD', 'REFER'];

function flattenBuckets(buckets: BandDayBucket[], keys: string[]): Array<Record<string, string | number>> {
  return buckets.map((b) => {
    const row: Record<string, string | number> = { date: b.date };
    for (const k of keys) row[k] = b.counts[k] ?? 0;
    return row;
  });
}

function BandBarChart({ rows, keys }: { rows: Array<Record<string, string | number>>; keys: string[] }) {
  if (rows.length === 0) return <EmptyNote>No sessions in this range.</EmptyNote>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ left: -20 }}>
        <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
        <XAxis dataKey="date" tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
        <YAxis allowDecimals={false} tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--shell-700)' }} />
        <Legend wrapperStyle={chartLegendStyle} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} name={k} stackId="band" fill={bandColorVar(k)} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DecisionPatternsSectionProps {
  patterns: DecisionPatterns;
}

/** §3: two separate charts for system band vs. officer decision — never
 *  merged, mirroring the backend contract's own deliberate split (see
 *  backend/app/contracts/dashboard.py's DecisionPatterns docstring). */
export function DecisionPatternsSection({ patterns }: DecisionPatternsSectionProps) {
  const systemRows = flattenBuckets(patterns.systemBandByDay, SYSTEM_BAND_KEYS);
  const officerRows = flattenBuckets(patterns.officerDecisionByDay, OFFICER_DECISION_KEYS);

  return (
    <section className="flex flex-col gap-4 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Decision patterns</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-scale-2 text-steel-400">System band, by day</h3>
          <BandBarChart rows={systemRows} keys={SYSTEM_BAND_KEYS} />
        </div>
        <div>
          <h3 className="mb-2 text-scale-2 text-steel-400">Officer decision, by day</h3>
          <BandBarChart rows={officerRows} keys={OFFICER_DECISION_KEYS} />
        </div>
      </div>

      <div className="grid gap-4 border-t border-shell-700 pt-4 md:grid-cols-[auto_1fr]">
        <StatCallout
          label="Override rate"
          value={`${patterns.overrideRatePct.toFixed(1)}%`}
          colorClass={patterns.overrideRatePct > 0 ? 'text-hold' : undefined}
          sublabel="whole range"
        />
        <div>
          <h3 className="mb-2 text-scale-2 text-steel-400">Override rate, by day</h3>
          {patterns.overridesByDay.length === 0 ? (
            <EmptyNote>No sessions in this range.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={patterns.overridesByDay} margin={{ left: -20 }}>
                <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis dataKey="date" tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
                <YAxis
                  unit="%"
                  tick={chartTickStyle}
                  axisLine={{ stroke: CHART_AXIS_STROKE }}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="overrideRatePct"
                  name="Override rate %"
                  stroke="var(--hold)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
