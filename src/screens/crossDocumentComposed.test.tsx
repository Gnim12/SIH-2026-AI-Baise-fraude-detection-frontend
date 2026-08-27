import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScreeningEvent } from '../types/screening';

// Case-13-shaped integration test: renders the REAL LaneScreen (not a
// hand-wired harness) and drives the store through the same applyEvent path
// the WebSocket would use, so this proves LaneScreen.tsx's actual prop
// wiring — session.documents / session.signals / session.crossDocumentSignals
// into CrossDocumentPanel — rather than re-asserting CrossDocumentPanel's
// own contract in isolation (that's CrossDocumentPanel.test.tsx's job).
vi.mock('../api/client', () => ({
  fetchCases: vi.fn().mockResolvedValue([]),
  startScreening: vi.fn().mockResolvedValue({ sessionId: 'sess-13' }),
  resolveAssetUrl: (path: string) => path,
}));

let capturedOnEvent: ((event: ScreeningEvent) => void) | null = null;
vi.mock('../api/socket', () => ({
  connectScreeningSocket: vi.fn(({ onEvent }: { onEvent: (event: ScreeningEvent) => void }) => {
    capturedOnEvent = onEvent;
    return { close: vi.fn() };
  }),
}));

const CROSS_DOC_FINDING = 'Visa portrait does not match the passport portrait for the same identity.';

async function dispatch(event: ScreeningEvent) {
  await act(async () => {
    capturedOnEvent?.(event);
  });
}

describe('LaneScreen composed: case-13 visa transplant shape', () => {
  beforeEach(() => {
    capturedOnEvent = null;
  });

  it('shows both document tabs clean while the cross-document panel carries the finding, in the same rendered LaneScreen', async () => {
    const { LaneScreen } = await import('./LaneScreen');
    render(
      <MemoryRouter>
        <LaneScreen />
      </MemoryRouter>,
    );

    // Let the mocked startScreening promise resolve and the socket "connect".
    await act(async () => {});
    expect(capturedOnEvent).not.toBeNull();

    await dispatch({ stage: 'received', sessionId: 'sess-13', laneId: 'LANE-1', officerId: 'OFF-1' });
    await dispatch({
      stage: 'classified',
      documentId: 'doc-passport',
      type: 'PASSPORT',
      country: 'FRA',
      version: 'v1',
      confidence: 0.99,
      imageUrl: '/assets/passport.svg',
    });
    await dispatch({
      stage: 'classified',
      documentId: 'doc-visa',
      type: 'VISA',
      country: 'FRA',
      version: 'v1',
      confidence: 0.99,
      imageUrl: '/assets/visa.svg',
    });
    await dispatch({ stage: 'ocr', documentId: 'doc-passport', fields: [], signals: [] });
    await dispatch({ stage: 'ocr', documentId: 'doc-visa', fields: [], signals: [] });
    await dispatch({
      stage: 'crossdoc',
      signals: [
        {
          id: 'sig-visa-transplant',
          code: 'CROSSDOC_PHOTO_TRANSPLANT',
          module: 'crossdoc',
          severity: 'critical',
          weight: 40,
          detail: CROSS_DOC_FINDING,
        },
      ],
    });

    // Scope to the Cross-document section specifically, since the main
    // FindingsList also renders "No findings." for its own empty state —
    // we need to prove THIS section shows both facts together.
    const section = screen
      .getByRole('heading', { level: 2, name: 'Cross-document' })
      .closest('div') as HTMLElement;

    // Fact 1: the cross-document finding is visible.
    expect(within(section).getByText(CROSS_DOC_FINDING)).toBeInTheDocument();

    // Fact 2: the active tab (passport, first document) is clean —
    // present in the SAME tree as fact 1, not a separate render.
    expect(within(section).getByText('No findings.')).toBeInTheDocument();

    // Fact 2, continued: the other document tab is also clean.
    fireEvent.click(within(section).getByText('VISA'));
    expect(within(section).getByText('No findings.')).toBeInTheDocument();

    // The finding is still there after switching tabs — it never depended
    // on which document tab was active, proving the two facts coexist.
    expect(within(section).getByText(CROSS_DOC_FINDING)).toBeInTheDocument();
  });
});
