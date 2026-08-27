import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';

/** M6: GET /api/v1/history and GET /api/v1/history/:id, and the seal path
 *  that feeds them (POST /api/v1/screening/:id/decision with a full
 *  session body) — against the REAL mock server, same pattern as
 *  src/integration/fixtures.test.ts. Proves history data is real sealed
 *  sessions (seeded fixtures + whatever this run itself seals), not
 *  fixtures dressed up as history. */

// A distinct port from fixtures.test.ts's server (8787) — Vitest may run
// test files concurrently, and both files spawn their own real server.
const PORT = 8788;
const SERVER_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/cases`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('mock server did not start in time');
}

describe('M6: /api/v1/history against the real mock server', () => {
  beforeAll(async () => {
    serverProcess = spawn('node', ['mock/server.mjs'], {
      stdio: 'pipe',
      env: { ...process.env, MOCK_SERVER_PORT: String(PORT) },
    });
    await waitForServer();
  }, 15000);

  afterAll(() => {
    serverProcess.kill();
  });

  it('seeds a handful of pre-sealed fixtures with plausible officer decisions on startup', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/history`);
    const entries = (await res.json()) as Array<{
      sessionId: string;
      sealed: boolean;
      band: string | null;
      documents: Array<{ type: string }>;
      officerDecision?: { decision: string; note: string; decidedAt: string; override: boolean };
    }>;

    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const entry of entries) {
      expect(entry.sealed).toBe(true);
      expect(entry.officerDecision).toBeTruthy();
      expect(entry.documents.length).toBeGreaterThan(0);
    }
    // At least one override and one non-override, so HistoryScreen's
    // filter has something real to prove.
    expect(entries.some((e) => e.officerDecision?.override)).toBe(true);
    expect(entries.some((e) => e.officerDecision?.override === false)).toBe(true);
  }, 10000);

  it('sealing a live-screened session via the decision endpoint makes it show up in history, full session data intact', async () => {
    const startRes = await fetch(`${SERVER_URL}/api/v1/screening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case-03-modified-dob' }),
    });
    const { sessionId } = (await startRes.json()) as { sessionId: string };

    // A minimal-but-real session shape, as LaneScreen would have
    // accumulated it from the WS tape by the time the officer submits.
    const session = {
      sessionId,
      laneId: 'IGI-T3-LANE-07',
      officerId: 'OFF-2291',
      startedAt: new Date().toISOString(),
      band: 'HOLD',
      risk: 80,
      confidence: 0.88,
      abstained: false,
      documents: [{ id: 'doc-1', type: 'PASSPORT', imageUrl: '/assets/x.svg', views: {}, fields: [], risk: 80 }],
      signals: [],
      face: null,
      graph: null,
      crossDocumentSignals: [],
      coverageFlags: [],
      timingMs: { total: 1680 },
      sealed: false,
    };

    const decisionRes = await fetch(`${SERVER_URL}/api/v1/screening/${sessionId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'HOLD', note: 'Confirmed on inspection.', override: false, session }),
    });
    expect(decisionRes.ok).toBe(true);

    const historyRes = await fetch(`${SERVER_URL}/api/v1/history`);
    const entries = (await historyRes.json()) as Array<{ sessionId: string; band: string }>;
    expect(entries.some((e) => e.sessionId === sessionId && e.band === 'HOLD')).toBe(true);

    const itemRes = await fetch(`${SERVER_URL}/api/v1/history/${sessionId}`);
    expect(itemRes.status).toBe(200);
    const item = (await itemRes.json()) as {
      documents: Array<{ type: string }>;
      officerDecision: { note: string };
    };
    expect(item.documents[0].type).toBe('PASSPORT');
    expect(item.officerDecision.note).toBe('Confirmed on inspection.');
  }, 10000);

  it('GET /api/v1/history/:id 404s for an unknown session', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/history/not-a-real-session`);
    expect(res.status).toBe(404);
  }, 10000);
});
