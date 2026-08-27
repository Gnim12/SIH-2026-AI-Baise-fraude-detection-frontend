import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScreeningView } from './ScreeningView';
import type { ScreeningSession } from '../types/screening';

const SESSION: ScreeningSession = {
  sessionId: 'sess-esc-test',
  laneId: 'IGI-T3-LANE-07',
  officerId: 'OFF-2291',
  startedAt: '2026-08-27T06:00:00.000Z',
  band: 'HOLD',
  risk: 80,
  confidence: 0.88,
  abstained: false,
  documents: [
    {
      id: 'doc-1',
      type: 'PASSPORT',
      imageUrl: '/assets/x.svg',
      views: { rgb: '/assets/x.svg' },
      fields: [],
      risk: 80,
    },
  ],
  signals: [
    {
      id: 'sig-1',
      code: 'TAMPER_ELA_DOB',
      module: 'tamper',
      severity: 'critical',
      weight: 28,
      detail: 'Error-level analysis shows a localized anomaly over the date of birth.',
      region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    },
  ],
  face: null,
  graph: null,
  crossDocumentSignals: [],
  coverageFlags: [],
  timingMs: {},
  sealed: false,
};

function sizeCanvas() {
  const container = document.querySelector('[data-testid="document-canvas-stage"]')!
    .parentElement as HTMLDivElement;
  Object.defineProperty(container, 'clientWidth', { value: 1000, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
  const img = container.querySelector('img') as HTMLImageElement;
  Object.defineProperty(img, 'naturalWidth', { value: 1200, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 800, configurable: true });
  act(() => {
    fireEvent.load(img);
  });
}

describe('ScreeningView', () => {
  beforeEach(() => {
    // @ts-expect-error jsdom has no ResizeObserver.
    delete window.ResizeObserver;
  });

  it('§8: Escape clears region focus on DocumentCanvas', () => {
    render(<ScreeningView session={SESSION} footer={<div>footer</div>} />);
    sizeCanvas();

    const findingsSection = screen.getByRole('heading', { level: 2, name: 'Findings' }).closest('div') as HTMLElement;
    fireEvent.click(within(findingsSection).getByText(SESSION.signals[0].detail));
    const regionBox = document.querySelector('[data-signal-id="sig-1"]') as HTMLButtonElement;
    expect(regionBox.className.split(' ')).toContain('border-hold');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(regionBox.className.split(' ')).not.toContain('border-hold');
    expect(regionBox.className).toContain('border-hold/50');
  });
});
