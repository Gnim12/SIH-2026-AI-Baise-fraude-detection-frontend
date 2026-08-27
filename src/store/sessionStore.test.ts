import { describe, expect, it } from 'vitest';
import { applyScreeningEvent, createEmptySession } from './sessionStore';
import type { ScreeningEvent, Signal } from '../types/screening';

const ocrSignal: Signal = {
  id: 'sig-ocr-1',
  code: 'MRZ_CHECKDIGIT_DOB',
  module: 'validation',
  severity: 'high',
  weight: 30,
  detail: 'DOB check digit mismatch.',
};

const events: ScreeningEvent[] = [
  { stage: 'received', sessionId: 'sess-1', laneId: 'LANE-07', officerId: 'OFF-2291' },
  { stage: 'quality', documentId: 'doc-1', ok: true, dpi: 312 },
  {
    stage: 'classified',
    documentId: 'doc-1',
    type: 'PASSPORT',
    country: 'IND',
    version: 'v1',
    confidence: 0.98,
    imageUrl: 'https://example.test/doc-1.png',
  },
  {
    stage: 'ocr',
    documentId: 'doc-1',
    fields: [
      { key: 'birth_date', label: 'Date of birth', value: '1990-04-12', confidence: 0.97, source: 'MERGED' },
    ],
    signals: [ocrSignal],
  },
  {
    stage: 'database',
    graph: { priorEncounters: [], conflicts: 0, impossibleTravel: false },
    signals: [],
  },
  {
    stage: 'forensics',
    documentId: 'doc-1',
    views: { rgb: 'https://example.test/doc-1-rgb.png' },
    signals: [],
  },
  { stage: 'crossdoc', signals: [] },
  {
    stage: 'decision',
    band: 'CLEAR',
    risk: 4,
    confidence: 0.95,
    abstained: false,
    coverageFlags: [],
    timingMs: { total: 1620 },
  },
];

function replay(order: ScreeningEvent[], base: ReturnType<typeof createEmptySession>) {
  return order.reduce(applyScreeningEvent, base);
}

describe('applyScreeningEvent', () => {
  it('produces the same final state regardless of event order', () => {
    // Reduce from a single shared base so both replays start from an
    // identical startedAt timestamp (createEmptySession stamps "now").
    const base = createEmptySession();
    const inOrder = replay(events, base);

    // deterministic "out of order" permutation: reverse the middle stages,
    // keep 'received' first since it seeds sessionId (its own arrival order
    // relative to sessionId-bearing fields is the only thing that matters).
    const [received, ...rest] = events;
    const outOfOrder = replay([received, ...rest.reverse()], base);

    expect(outOfOrder).toEqual(inOrder);
  });

  it('does not append a duplicate signal id', () => {
    const once = applyScreeningEvent(createEmptySession(), {
      stage: 'ocr',
      documentId: 'doc-1',
      fields: [],
      signals: [ocrSignal],
    });

    const twice = applyScreeningEvent(once, {
      stage: 'ocr',
      documentId: 'doc-1',
      fields: [],
      signals: [ocrSignal],
    });

    expect(twice.signals).toHaveLength(1);
    expect(twice.signals[0].id).toBe(ocrSignal.id);
  });

  it('leaves face null with no self-set coverage flag when face never arrives', () => {
    const withoutFace = events.filter((e) => e.stage !== 'face');
    const final = replay(withoutFace, createEmptySession());

    expect(final.face).toBeNull();
    // coverageFlags only ever come from the 'decision' event's payload.
    expect(final.coverageFlags).toEqual([]);
  });

  it('sets coverageFlags only from the decision event, not from absence', () => {
    const final = replay(
      [
        ...events.filter((e) => e.stage !== 'face' && e.stage !== 'decision'),
        {
          stage: 'decision',
          band: 'HOLD',
          risk: 40,
          confidence: 0.6,
          abstained: false,
          coverageFlags: ['no_biometric'],
          timingMs: { total: 1000 },
        },
      ],
      createEmptySession(),
    );

    expect(final.face).toBeNull();
    expect(final.coverageFlags).toEqual(['no_biometric']);
  });
});
