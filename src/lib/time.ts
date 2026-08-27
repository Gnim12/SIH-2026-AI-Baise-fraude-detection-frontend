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
