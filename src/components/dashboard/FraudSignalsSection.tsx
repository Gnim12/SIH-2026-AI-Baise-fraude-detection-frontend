import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FraudSignals } from '../../types/dashboard';
import { ChartTooltip } from './ChartTooltip';
import { EmptyNote } from './EmptyNote';
import { StatCallout } from './StatCallout';
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, chartTickStyle } from './chartTheme';

interface FraudSignalsSectionProps {
  fraud: FraudSignals;
}

export function FraudSignalsSection({ fraud }: FraudSignalsSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Fraud signals</h2>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <h3 className="mb-2 text-scale-2 text-steel-400">Top signal codes</h3>
          {fraud.topSignalCodes.length === 0 ? (
            <EmptyNote>No fraud signals in this range.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, fraud.topSignalCodes.length * 28)}>
              <BarChart data={fraud.topSignalCodes} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke={CHART_GRID_STROKE} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={chartTickStyle} axisLine={{ stroke: CHART_AXIS_STROKE }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="code"
                  width={190}
                  tick={{ ...chartTickStyle, fontSize: 10 }}
                  axisLine={{ stroke: CHART_AXIS_STROKE }}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--shell-700)' }} />
                {/* --hold, not a neutral colour: every signal code here is
                 *  by definition an adverse finding, same convention as
                 *  region-overlay boxes / MRZ ribbon failing groups. */}
                <Bar dataKey="count" name="Occurrences" fill="var(--hold)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col justify-center gap-3 border-t border-shell-700 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <StatCallout
            label="Convergence groups"
            value={String(fraud.sessionsWithConvergenceGroup)}
            colorClass={fraud.sessionsWithConvergenceGroup > 0 ? 'text-hold' : undefined}
            sublabel={`${fraud.sessionsWithConvergenceGroupPct.toFixed(1)}% of sessions`}
          />
        </div>
      </div>
    </section>
  );
}
