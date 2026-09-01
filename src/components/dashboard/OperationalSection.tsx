import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OperationalMetrics } from '../../types/dashboard';
import { ChartTooltip } from './ChartTooltip';
import { EmptyNote } from './EmptyNote';
import { StatCallout } from './StatCallout';
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, chartTickStyle } from './chartTheme';

interface OperationalSectionProps {
  operational: OperationalMetrics;
}

function formatMs(ms: number | null): string {
  return ms === null ? '—' : `${Math.round(ms)} ms`;
}

export function OperationalSection({ operational }: OperationalSectionProps) {
  const maxCoverage = Math.max(1, ...operational.coverageFlagFrequency.map((f) => f.sessionCount));

  return (
    <section className="flex flex-col gap-4 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Operational</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-scale-2 text-steel-400">Session volume, by day</h3>
          {operational.sessionsByDay.length === 0 ? (
            <EmptyNote>No sessions in this range.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={operational.sessionsByDay} margin={{ left: -20 }}>
                <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis dataKey="date" tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--shell-700)' }} />
                <Bar dataKey="count" name="Sessions" fill="var(--steel-400)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-scale-2 text-steel-400">Latency</h3>
          {operational.latency.sampleSize === 0 ? (
            <EmptyNote>No timed sessions in this range.</EmptyNote>
          ) : (
            <>
              <div className="flex gap-8">
                <StatCallout label="p50" value={formatMs(operational.latency.p50Ms)} />
                <StatCallout label="p95" value={formatMs(operational.latency.p95Ms)} />
              </div>
              <span className="text-scale-1 text-steel-400">n = {operational.latency.sampleSize}</span>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-shell-700 pt-4">
        <h3 className="mb-2 text-scale-2 text-steel-400">Coverage-flag frequency</h3>
        {/* Ranked list, not a pie chart (§3): precise reading of a count
         *  matters more here than a proportion at a glance. */}
        {operational.coverageFlagFrequency.length === 0 ? (
          <EmptyNote>No coverage gaps in this range.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {operational.coverageFlagFrequency.map((f) => (
              <li key={f.flag} className="flex items-center gap-2 text-scale-2">
                <span className="w-40 shrink-0 truncate text-steel-300" title={f.flag}>
                  {f.flag}
                </span>
                <div className="h-2 flex-1 rounded-sm bg-shell-700">
                  <div
                    className="h-2 rounded-sm bg-secondary"
                    style={{ width: `${(f.sessionCount / maxCoverage) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-steel-200">{f.sessionCount}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
