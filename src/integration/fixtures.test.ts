import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { applyScreeningEvent, createEmptySession } from '../store/sessionStore';
import type { ScreeningEvent, ScreeningSession } from '../types/screening';

/** M5: one integration test per case (§9's acceptance line for this
 *  milestone), each loading its fixture through the REAL mock server —
 *  real HTTP POST /api/v1/screening, real WebSocket tape replay — rather
 *  than hand-authoring event data inline. This is what actually catches
 *  typos/shape errors in the 12 fixtures added this milestone; component-
 *  level tests already cover the render contracts for null/edge states. */

const SERVER_URL = 'http://localhost:8787';
const FIXTURES_DIR = path.join(process.cwd(), 'mock', 'fixtures');

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

function tapeLength(caseId: string): number {
  const file = path.join(FIXTURES_DIR, `${caseId}.json`);
  const fixture = JSON.parse(fs.readFileSync(file, 'utf-8')) as { tape: unknown[] };
  return fixture.tape.length;
}

/** Replays a case's full tape over a real WebSocket connection to the real
 *  mock server, returning both the raw events IN ARRIVAL ORDER (needed for
 *  case-09's ordering assertion, which array order in the fixture cannot
 *  prove) and the session reduced from that same arrival order via the
 *  real M1 reducer. */
async function loadCase(caseId: string): Promise<{ events: ScreeningEvent[]; session: ScreeningSession }> {
  const startRes = await fetch(`${SERVER_URL}/api/v1/screening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId }),
  });
  const { sessionId } = (await startRes.json()) as { sessionId: string };

  const expectedCount = tapeLength(caseId);
  const events: ScreeningEvent[] = [];

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:8787/ws/screening/${sessionId}`);
    const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${caseId}`)), 8000);

    ws.onmessage = (msg) => {
      events.push(JSON.parse(msg.data as string) as ScreeningEvent);
      if (events.length >= expectedCount) {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
  });

  const session = events.reduce(applyScreeningEvent, createEmptySession());
  return { events, session };
}

describe('M5: all fifteen fixtures, via the real mock server', () => {
  beforeAll(async () => {
    serverProcess = spawn('node', ['mock/server.mjs'], { stdio: 'pipe' });
    await waitForServer();
  }, 15000);

  afterAll(() => {
    serverProcess.kill();
  });

  it('case-00: RECAPTURE takeover — no score anywhere, and no stage past quality ever arrives', async () => {
    const { events, session } = await loadCase('case-00-bad-capture');

    // The quality gate blocked before any scoring pipeline ran, so there is
    // no decision event and band never becomes non-null — recaptureReason
    // alone is what the UI takeover keys off (see LaneScreen's isRecapture).
    expect(session.band).toBeNull();
    expect(session.risk).toBeNull();
    expect(session.recaptureReason).toBeTruthy();
    expect(session.recaptureHint).toBeTruthy();
    // Nothing past the quality gate ever arrives — not even a decision.
    expect(events.map((e) => e.stage)).toEqual(['received', 'quality']);
  }, 10000);

  it('case-01: clean CLEAR with a genuinely empty findings state', async () => {
    const { session } = await loadCase('case-01-genuine');
    expect(session.band).toBe('CLEAR');
    expect(session.signals).toHaveLength(0);
  }, 10000);

  it('case-02: SECONDARY from a rule violation, not tamper/fraud modules', async () => {
    const { session } = await loadCase('case-02-expired-document');
    expect(session.band).toBe('SECONDARY');
    expect(session.signals.some((s) => s.code === 'DOCUMENT_EXPIRED')).toBe(true);
    expect(session.signals.every((s) => s.module !== 'tamper')).toBe(true);
  }, 10000);

  it('case-03: convergence group — 3 modules agree on one region', async () => {
    const { session } = await loadCase('case-03-modified-dob');
    const converging = session.signals.filter((s) => s.convergenceGroup === 'dob-region');
    expect(converging).toHaveLength(3);
    expect(new Set(converging.map((s) => s.module)).size).toBe(3);
  }, 10000);

  it('case-04: face passes while the document fails — verdict is not confused by the good face match', async () => {
    const { session } = await loadCase('case-04-photo-replacement');
    expect(session.face?.status).toBe('MATCH');
    expect(session.face?.similarity).toBeGreaterThanOrEqual(session.face?.threshold ?? Infinity);
    expect(session.band).toBe('HOLD');
  }, 10000);

  it('case-05: copy-move stamp forgery — one signal code, two distinct regions', async () => {
    const { session } = await loadCase('case-05-stamp-forgery');
    const copyMove = session.signals.filter((s) => s.code === 'COPY_MOVE_STAMP');
    expect(copyMove).toHaveLength(2);
    expect(copyMove[0].region).not.toEqual(copyMove[1].region);
  }, 10000);

  it('case-06: document clean, face similarity 0.24 — FacePair is the evidence', async () => {
    const { session } = await loadCase('case-06-impersonation');
    expect(session.face?.similarity).toBe(0.24);
    const documentModules = ['tamper', 'template', 'validation', 'ovd'] as const;
    expect(session.signals.every((s) => !documentModules.includes(s.module as (typeof documentModules)[number]))).toBe(
      true,
    );
  }, 10000);

  it('case-07: identity graph carries a conflicting prior encounter', async () => {
    const { session } = await loadCase('case-07-multiple-identities');
    expect(session.graph?.conflicts).toBe(1);
    expect(session.graph?.priorEncounters.some((e) => e.conflict)).toBe(true);
  }, 10000);

  it('case-08: presentation attack — similarity null, PAD verdict is the whole story', async () => {
    const { session } = await loadCase('case-08-presentation-attack');
    expect(session.face?.similarity).toBeNull();
    expect(session.face?.padVerdict).toBe('spoof');
    expect(session.face?.status).toBe('SPOOF');
  }, 10000);

  it('case-09: risk 100 / HOLD arrives BEFORE later stages finish streaming in', async () => {
    const { events, session } = await loadCase('case-09-watchlist-hit');
    const stages = events.map((e) => e.stage);

    expect(session.risk).toBe(100);
    expect(session.band).toBe('HOLD');

    const decisionIndex = stages.indexOf('decision');
    const forensicsIndex = stages.indexOf('forensics');
    const crossdocIndex = stages.indexOf('crossdoc');
    const ocrIndex = stages.indexOf('ocr');
    const faceIndex = stages.indexOf('face');

    expect(decisionIndex).toBeGreaterThanOrEqual(0);
    expect(decisionIndex).toBeLessThan(ocrIndex);
    expect(decisionIndex).toBeLessThan(faceIndex);
    expect(decisionIndex).toBeLessThan(forensicsIndex);
    expect(decisionIndex).toBeLessThan(crossdocIndex);
  }, 10000);

  it('case-10: ABSTAIN — no numeral, risk is null', async () => {
    const { session } = await loadCase('case-10-low-confidence');
    expect(session.band).toBe('ABSTAIN');
    expect(session.risk).toBeNull();
    expect(session.abstained).toBe(true);
  }, 10000);

  it('case-11: single template-anomaly signal, no known-attack signal, not grouped', async () => {
    const { session } = await loadCase('case-11-novel-forgery');
    expect(session.signals).toHaveLength(1);
    expect(session.signals[0].module).toBe('template');
    expect(session.signals[0].convergenceGroup).toBeUndefined();
  }, 10000);

  it('case-12: two documents, the rule-violation signal is on the visa document only', async () => {
    const { session } = await loadCase('case-12-visa-rule-violation');
    expect(session.documents.map((d) => d.id).sort()).toEqual(['doc-passport', 'doc-visa']);
    const visaSignals = session.signals.filter((s) => s.region?.documentId === 'doc-visa');
    const passportSignals = session.signals.filter((s) => s.region?.documentId === 'doc-passport');
    expect(visaSignals.length).toBeGreaterThan(0);
    expect(passportSignals).toHaveLength(0);
  }, 10000);

  it('case-13: both documents individually clean, non-empty crossDocumentSignals', async () => {
    const { session } = await loadCase('case-13-visa-transplant');
    expect(session.documents).toHaveLength(2);
    expect(session.signals).toHaveLength(0);
    expect(session.crossDocumentSignals.length).toBeGreaterThan(0);
  }, 10000);

  it('case-14: face never arrives — coverageFlags carries no_biometric, confidence reduced', async () => {
    const { events, session } = await loadCase('case-14-module-failure');
    expect(events.some((e) => e.stage === 'face')).toBe(false);
    expect(session.face).toBeNull();
    expect(session.coverageFlags).toContain('no_biometric');
    expect(session.confidence).not.toBeNull();
    expect(session.confidence as number).toBeLessThan(0.7);
  }, 10000);
});
