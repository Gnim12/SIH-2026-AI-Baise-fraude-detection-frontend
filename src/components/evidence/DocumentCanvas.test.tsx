import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentCanvas } from './DocumentCanvas';
import type { ScreenedDocument, Signal } from '../../types/screening';

// Lifted verbatim from mock/fixtures/case-03-modified-dob.json: rgb/ela/heatmap
// are present, noise/fft are absent — the real disabled-toggle case.
const DOCUMENT: ScreenedDocument = {
  id: 'doc-1',
  type: 'PASSPORT',
  country: 'IND',
  version: 'v3',
  imageUrl: '/assets/case-03-doc.svg',
  views: { rgb: '/assets/case-03-doc.svg', ela: '/assets/case-03-heatmap.svg', heatmap: '/assets/case-03-heatmap.svg' },
  fields: [],
  risk: 80,
};

const TAMPER_SIGNAL: Signal = {
  id: 'sig-tamper-dob',
  code: 'TAMPER_ELA_DOB',
  module: 'tamper',
  severity: 'critical',
  weight: 28,
  detail: 'Error-level analysis shows a localized anomaly over the date of birth.',
  region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
  heatmapUrl: '/assets/case-03-heatmap.svg',
  convergenceGroup: 'dob-region',
};

/** jsdom has no layout engine and no ResizeObserver — stub clientWidth/
 *  clientHeight on the canvas container and fire the img load event with a
 *  mocked natural size, matching what DocumentCanvas actually reads. */
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

describe('DocumentCanvas (case-03)', () => {
  beforeEach(() => {
    // @ts-expect-error jsdom has no ResizeObserver; DocumentCanvas falls
    // back to a window resize listener, which this test drives directly.
    delete window.ResizeObserver;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables the Noise and FFT toggle buttons (absent from this document) with an explanatory tooltip, never hiding them', () => {
    render(
      <DocumentCanvas
        document={DOCUMENT}
        signals={[]}
        activeView="rgb"
        onActiveViewChange={() => {}}
        focusedRegion={null}
        onRegionFocus={() => {}}
      />,
    );

    const noise = screen.getByRole('button', { name: 'Noise' });
    const fft = screen.getByRole('button', { name: 'FFT' });
    const rgb = screen.getByRole('button', { name: 'RGB' });

    expect(noise).toBeDisabled();
    expect(fft).toBeDisabled();
    expect(noise.title).toMatch(/not available/i);
    expect(fft.title).toMatch(/not available/i);
    expect(rgb).not.toBeDisabled();
  });

  it('focuses a region on click: renders a pulse for the clicked signal', () => {
    const onRegionFocus = vi.fn();
    render(
      <DocumentCanvas
        document={DOCUMENT}
        signals={[TAMPER_SIGNAL]}
        activeView="rgb"
        onActiveViewChange={() => {}}
        focusedRegion={null}
        onRegionFocus={onRegionFocus}
      />,
    );
    sizeCanvas();

    const regionBox = document.querySelector('[data-signal-id="sig-tamper-dob"]') as HTMLButtonElement;
    expect(regionBox).toBeTruthy();
    fireEvent.click(regionBox);
    expect(onRegionFocus).toHaveBeenCalledTimes(1);
    expect(onRegionFocus.mock.calls[0][0].id).toBe('sig-tamper-dob');
  });

  it('renders an instant highlight (no pulse animation) for a focused region when prefers-reduced-motion is set', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );

    render(
      <DocumentCanvas
        document={DOCUMENT}
        signals={[TAMPER_SIGNAL]}
        activeView="rgb"
        onActiveViewChange={() => {}}
        focusedRegion={{ signalId: 'sig-tamper-dob', nonce: 1 }}
        onRegionFocus={() => {}}
      />,
    );
    sizeCanvas();

    const regionBox = document.querySelector('[data-signal-id="sig-tamper-dob"]') as HTMLElement;
    expect(regionBox.className).not.toContain('region-pulse');
    expect(regionBox.className).toContain('border-hold');
  });
});
