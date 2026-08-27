import type { ConnectionState } from '../../api/socket';

interface LaneHeaderProps {
  laneId: string;
  officerId: string;
  connectionState: ConnectionState;
  watchlistSyncedAt: string | null;
}

function connectionLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'connected';
    case 'reconnecting':
      return 'reconnecting…';
    case 'offline':
      return 'offline — screening continues against cached watchlist';
  }
}

export function LaneHeader({
  laneId,
  officerId,
  connectionState,
  watchlistSyncedAt,
}: LaneHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b border-gray-700 px-4 py-2 text-sm">
      <span>{laneId}</span>
      <span>{officerId}</span>
      <span role="status" aria-live="polite">
        {connectionLabel(connectionState)}
      </span>
      <span>
        {watchlistSyncedAt
          ? `watchlist synced ${watchlistSyncedAt}`
          : 'watchlist sync unknown'}
      </span>
    </header>
  );
}
