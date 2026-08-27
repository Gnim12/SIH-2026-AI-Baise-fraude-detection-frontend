import { formatHoursAgo, hoursSince, stalenessBand, type StalenessBand } from '../../lib/time';

const COLOR_CLASS: Record<StalenessBand, string> = {
  fresh: 'text-steel-400',
  stale: 'text-secondary',
  expired: 'text-hold',
};

interface StalenessBadgeProps {
  /** ISO timestamp of the last watchlist sync. */
  lastSyncedAt: string;
  now?: Date;
}

/** "watchlist synced 4h ago" — neutral under 12h, --secondary 12-24h,
 *  --hold above 24h (§5.6). A clear result computed against a stale
 *  watchlist is a qualified result and must say so. */
export function StalenessBadge({ lastSyncedAt, now }: StalenessBadgeProps) {
  const hours = hoursSince(lastSyncedAt, now);
  const band = stalenessBand(hours);

  return (
    <span className={`flex items-center gap-1 text-scale-2 ${COLOR_CLASS[band]}`}>
      <span>watchlist synced {formatHoursAgo(hours)}</span>
      {band !== 'fresh' && <span aria-hidden="true">⚠</span>}
    </span>
  );
}
