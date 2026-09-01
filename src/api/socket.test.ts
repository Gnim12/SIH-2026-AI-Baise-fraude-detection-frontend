import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectScreeningSocket, type ConnectionState } from './socket';

/** jsdom has no real WebSocket implementation wired to a server, and this
 *  test needs to control exactly when/how the socket "closes" (including
 *  with a specific close code) — a hand-rolled fake standing in for the
 *  WebSocket constructor is the direct way to do that. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  private listeners: Record<string, Array<(event: { code?: number }) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: (event: { code?: number }) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  close() {
    this.dispatch('close', { code: 1000 });
  }

  dispatch(type: string, event: { code?: number } = {}) {
    this.listeners[type]?.forEach((cb) => cb(event));
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('connectScreeningSocket', () => {
  it('a plain network drop (any non-4401 close) reconnects with backoff', () => {
    const statuses: ConnectionState[] = [];
    connectScreeningSocket({ sessionId: 's1', onEvent: vi.fn(), onStatusChange: (s) => statuses.push(s) });

    expect(FakeWebSocket.instances).toHaveLength(1);
    FakeWebSocket.instances[0].dispatch('close', { code: 1006 });

    expect(statuses).toContain('reconnecting');
    vi.advanceTimersByTime(600);
    expect(FakeWebSocket.instances).toHaveLength(2); // reconnect attempt fired
  });

  it('a 4401 close reports "expired" and does NOT schedule a reconnect', () => {
    const statuses: ConnectionState[] = [];
    connectScreeningSocket({ sessionId: 's1', onEvent: vi.fn(), onStatusChange: (s) => statuses.push(s) });

    expect(FakeWebSocket.instances).toHaveLength(1);
    FakeWebSocket.instances[0].dispatch('close', { code: 4401 });

    // 'expired' reported, and 'reconnecting' never was -- a caller
    // distinguishing these (AppShell) must be able to tell them apart.
    expect(statuses).toEqual(['expired']);

    // The one thing this test exists to prove: advancing well past any
    // backoff window fires no second connection attempt.
    vi.advanceTimersByTime(30_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('close() by the caller after a 4401 is a no-op, not a fresh reconnect', () => {
    const statuses: ConnectionState[] = [];
    const socket = connectScreeningSocket({ sessionId: 's1', onEvent: vi.fn(), onStatusChange: (s) => statuses.push(s) });

    FakeWebSocket.instances[0].dispatch('close', { code: 4401 });
    socket.close();
    vi.advanceTimersByTime(30_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(statuses).toEqual(['expired']);
  });
});
