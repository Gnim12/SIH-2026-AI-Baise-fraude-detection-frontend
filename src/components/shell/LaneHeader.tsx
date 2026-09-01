import { Link } from 'react-router-dom';
import type { ConnectionState } from '../../api/socket';
import { useThemeStore, type ThemePreference } from '../../store/themeStore';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

/** Dense three-way instrument switch, not a sun/moon slider — the lane
 *  header reads like the rest of the console's telemetry, not a settings
 *  toy. The pressed segment shows the user's stored preference (`system`
 *  stays pressed even though the resolved theme tracks the OS). */
function ThemeSwitch() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <span role="group" aria-label="Theme" className="flex overflow-hidden rounded border border-shell-600 text-scale-1 font-mono uppercase tracking-wide">
      {THEME_OPTIONS.map((option) => {
        const pressed = preference === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={pressed}
            onClick={() => setPreference(option)}
            className={`px-2 py-1 ${pressed ? 'bg-shell-600 text-steel-200' : 'text-steel-400 hover:bg-shell-700 hover:text-steel-300'}`}
          >
            {option}
          </button>
        );
      })}
    </span>
  );
}

interface LaneHeaderProps {
  laneId: string;
  officerId: string;
  connectionState: ConnectionState;
  watchlistSyncedAt: string | null;
  /** Absent on screens with no logged-in officer to log out (there
   *  shouldn't be any — LaneHeader only mounts once AppShell has an
   *  authenticated officer — but kept optional rather than assumed). */
  onLogout?: () => void;
}

function connectionLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'connected';
    case 'reconnecting':
      return 'reconnecting…';
    case 'offline':
      return 'offline — screening continues against cached watchlist';
    case 'expired':
      return 'session expired';
  }
}

export function LaneHeader({
  laneId,
  officerId,
  connectionState,
  watchlistSyncedAt,
  onLogout,
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
      <span className="ml-auto flex items-center gap-4">
        <Link
          to="/dashboard"
          className="rounded border border-shell-600 px-2 py-1 text-scale-2 text-steel-200 hover:bg-shell-700"
        >
          Dashboard
        </Link>
        <ThemeSwitch />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-shell-600 px-2 py-1 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Log out
          </button>
        )}
      </span>
    </header>
  );
}
