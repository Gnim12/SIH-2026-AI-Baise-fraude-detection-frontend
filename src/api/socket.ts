import type { ScreeningEvent } from '../types/screening';

// See api/client.ts's API_BASE: same VITE_API_BASE-driven override, e.g.
//   VITE_WS_BASE=ws://localhost:8000
const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8787';

// 'expired': the server closed the socket with code 4401 (app/api/stream.py
// -- the session cookie was missing/invalid at connect time, or the
// session was revoked mid-stream, e.g. logout from another tab). This is
// NOT a network drop: the socket must not auto-reconnect (retrying would
// just get 4401 again forever), and the caller is responsible for sending
// the officer back to /login (see AppShell's effect on this state).
export type ConnectionState = 'connected' | 'reconnecting' | 'offline' | 'expired';

interface ConnectOptions {
  sessionId: string;
  onEvent: (event: ScreeningEvent) => void;
  onStatusChange: (status: ConnectionState) => void;
}

export interface ScreeningSocket {
  close: () => void;
}

/** Connects to the mock server's per-session event tape and dispatches
 *  each parsed event to `onEvent`. Reconnects with backoff on drop. */
export function connectScreeningSocket({
  sessionId,
  onEvent,
  onStatusChange,
}: ConnectOptions): ScreeningSocket {
  let socket: WebSocket | null = null;
  let closedByCaller = false;
  let retryDelayMs = 500;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    socket = new WebSocket(`${WS_BASE}/ws/screening/${sessionId}`);

    socket.addEventListener('open', () => {
      retryDelayMs = 500;
      onStatusChange('connected');
    });

    socket.addEventListener('message', (message) => {
      try {
        const event = JSON.parse(message.data as string) as ScreeningEvent;
        onEvent(event);
      } catch {
        // malformed frame; ignore rather than crash the session
      }
    });

    socket.addEventListener('close', (event) => {
      if (closedByCaller) return;
      // app/api/stream.py's WS auth: closes with 4401 when the session
      // cookie is missing/invalid, before or after accept(). Distinct from
      // every other close (network drop, server restart, tab backgrounded)
      // -- those are transient and worth retrying; this one will never
      // succeed by retrying, since the credentials are simply gone.
      if (event.code === 4401) {
        onStatusChange('expired');
        return;
      }
      onStatusChange('reconnecting');
      retryTimer = setTimeout(() => {
        retryDelayMs = Math.min(retryDelayMs * 2, 8000);
        onStatusChange('reconnecting');
        connect();
      }, retryDelayMs);
    });

    socket.addEventListener('error', () => {
      socket?.close();
    });
  }

  connect();

  return {
    close: () => {
      closedByCaller = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    },
  };
}
