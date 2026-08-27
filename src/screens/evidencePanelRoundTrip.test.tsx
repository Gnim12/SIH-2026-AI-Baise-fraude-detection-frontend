import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DocumentCanvas } from '../components/evidence/DocumentCanvas';
import { MrzRibbon } from '../components/evidence/MrzRibbon';
import type { FocusedRegion } from '../components/evidence/RegionOverlay';
import type { ViewKey } from '../components/evidence/ViewToggle';
import { FindingsList } from '../components/findings/FindingsList';
import type { MrzLine, ScreenedDocument, Signal } from '../types/screening';

// Everything below is lifted verbatim from mock/fixtures/case-03-modified-dob.json.
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

const LINES: MrzLine[] = [
  { text: 'P<INDDUPONT<<JEAN<<<<<<<<<<<<<<<<<<<<<<<<<<<', groups: [] },
  {
    text: 'L898902C36IND7408127F1204159ZE184226B<<<<<10',
    groups: [
      { name: 'doc_number', start: 0, end: 9, checkDigitIndex: 9, valid: true },
      {
        name: 'birth_date',
        start: 13,
        end: 19,
        checkDigitIndex: 19,
        valid: false,
        expected: '4',
        read: '7',
        signalId: 'sig-mrz-dob',
      },
      { name: 'expiry_date', start: 21, end: 27, checkDigitIndex: 27, valid: true },
    ],
  },
];

const SIGNALS: Signal[] = [
  {
    id: 'sig-mrz-dob',
    code: 'MRZ_CHECKDIGIT_DOB',
    module: 'validation',
    severity: 'high',
    weight: 30,
    detail: 'MRZ check digit for date of birth does not match.',
    region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-font-dob',
    code: 'FONT_MISMATCH_DOB',
    module: 'template',
    severity: 'high',
    weight: 22,
    detail: 'Font in date of birth field does not match the document template.',
    region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-tamper-dob',
    code: 'TAMPER_ELA_DOB',
    module: 'tamper',
    severity: 'critical',
    weight: 28,
    detail: 'Error-level analysis shows a localized anomaly over the date of birth.',
    region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    heatmapUrl: '/assets/case-03-heatmap.svg',
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-watchlist-clear',
    code: 'WATCHLIST_CLEAR',
    module: 'database',
    severity: 'info',
    weight: 0,
    detail: 'No watchlist match.',
  },
];

const MODULE_VIEW: Partial<Record<Signal['module'], ViewKey>> = {
  tamper: 'heatmap',
  ocr: 'rgb',
};

/** Mirrors the wiring LaneScreen owns: findings <-> canvas <-> ribbon,
 *  proving the round trip without standing up the socket/fetch layer. */
function EvidencePanelHarness() {
  const [activeView, setActiveView] = useState<ViewKey>('rgb');
  const [focusedRegion, setFocusedRegion] = useState<FocusedRegion | null>(null);
  const [highlightedSignalId, setHighlightedSignalId] = useState<string | null>(null);

  function focusSignal(signal: Signal) {
    if (!signal.region) return;
    setFocusedRegion({ signalId: signal.id, nonce: Date.now() });
    const view = MODULE_VIEW[signal.module];
    if (view) setActiveView(view);
  }

  return (
    <div>
      <div data-testid="active-view">{activeView}</div>
      <MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines: LINES }} signals={SIGNALS} onGroupSelect={(s) => setHighlightedSignalId(s.id)} />
      <DocumentCanvas
        document={DOCUMENT}
        signals={SIGNALS}
        activeView={activeView}
        onActiveViewChange={setActiveView}
        focusedRegion={focusedRegion}
        onRegionFocus={focusSignal}
      />
      <FindingsList signals={SIGNALS} onSelectSignal={focusSignal} highlightedSignalId={highlightedSignalId} />
    </div>
  );
}

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

describe('case-03 round trip: finding <-> canvas <-> MRZ ribbon', () => {
  beforeEach(() => {
    // @ts-expect-error jsdom has no ResizeObserver.
    delete window.ResizeObserver;
  });

  it('clicking the tamper finding focuses the DOB region on the canvas and switches to the heatmap view', () => {
    render(<EvidencePanelHarness />);
    sizeCanvas();

    expect(screen.getByTestId('active-view').textContent).toBe('rgb');

    const tamperRow = screen.getByText(SIGNALS[2].detail);
    fireEvent.click(tamperRow);

    expect(screen.getByTestId('active-view').textContent).toBe('heatmap');
    const regionBox = document.querySelector('[data-signal-id="sig-tamper-dob"]') as HTMLButtonElement;
    expect(regionBox.className).toContain('border-hold');
  });

  it('clicking the MRZ birth_date group scrolls to and highlights sig-mrz-dob in the findings list', () => {
    render(<EvidencePanelHarness />);
    sizeCanvas();

    const dobGroupButton = document.querySelector('[data-group-name="birth_date"]') as HTMLButtonElement;
    fireEvent.click(dobGroupButton);

    const mrzFindingRow = screen.getByText(SIGNALS[0].detail).closest('li');
    expect(mrzFindingRow?.className).toContain('ring-hold');
  });

  it('does not call the focus function for the no-region watchlist finding', () => {
    render(<EvidencePanelHarness />);
    sizeCanvas();

    const noLocationRow = screen.getByText('No watchlist match.').closest('li')!;
    expect(noLocationRow.textContent).toContain('no location');
    // Clicking it must not throw or move the canvas focus/view state.
    fireEvent.click(screen.getByText('No watchlist match.'));
    expect(screen.getByTestId('active-view').textContent).toBe('rgb');
  });
});
