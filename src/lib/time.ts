export type StalenessBand = 'fresh' | 'stale' | 'expired';

/** §5.6: neutral under 12h, --secondary 12-24h, --hold above 24h.
 *  "Above 12h" / "above 24h" are read literally: the boundary values
 *  themselves stay in the lower band, only values strictly greater escalate. */
export function stalenessBand(hoursElapsed: number): StalenessBand {
  if (hoursElapsed > 24) return 'expired';
  if (hoursElapsed > 12) return 'stale';
  return 'fresh';
}

export function hoursSince(isoTimestamp: string, now: Date = new Date()): number {
  return (now.getTime() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60);
}

export function formatHoursAgo(hoursElapsed: number): string {
  const rounded = Math.round(hoursElapsed);
  return `${rounded}h ago`;
}

/** 'YYYY-MM-DD', local calendar date — what DashboardScreen's date-range
 *  inputs (native <input type="date">) both read and write, and what
 *  GET /api/v1/dashboard/summary's from_date/to_date query params expect. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Matches backend/app/api/dashboard.py's own default exactly
 *  (DEFAULT_RANGE_DAYS = 30, resolved_from = resolved_to - 29 days) — this
 *  is only the frontend's initial control state, the backend applies the
 *  same default independently if a request ever omitted the params, but
 *  DashboardScreen always sends them explicitly so the visible range and
 *  the queried range never disagree. */
export function defaultDashboardRange(now: Date = new Date()): { fromDate: string; toDate: string } {
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { fromDate: isoDate(from), toDate: isoDate(now) };
}

/** Officer-facing timestamp for history rows and the sealed record —
 *  local time, date + minute precision, no seconds (an officer never
 *  needs to disambiguate two decisions a second apart). */
export function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
