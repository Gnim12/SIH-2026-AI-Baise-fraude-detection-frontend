import type { ScreeningEvent } from '../types/screening';

const WS_BASE = 'ws://localhost:8787';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

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

    socket.addEventListener('close', () => {
      if (closedByCaller) return;
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
