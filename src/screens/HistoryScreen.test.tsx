import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ScreeningSession } from '../types/screening';

const fetchHistory = vi.fn();
vi.mock('../api/client', () => ({
  fetchHistory: (...args: unknown[]) => fetchHistory(...args),
}));

function makeSession(overrides: Partial<ScreeningSession>): ScreeningSession {
  return {
    sessionId: 'sess-1',
    laneId: 'IGI-T3-LANE-07',
    officerId: 'OFF-2291',
    startedAt: '2026-08-27T06:00:00.000Z',
    band: 'CLEAR',
    risk: 3,
    confidence: 0.97,
    abstained: false,
    documents: [{ id: 'doc-1', type: 'PASSPORT', imageUrl: '', views: {}, fields: [], risk: 3 }],
    signals: [],
    face: null,
    graph: null,
    crossDocumentSignals: [],
    coverageFlags: [],
    timingMs: {},
    sealed: true,
    officerDecision: { decision: 'CLEAR', note: '', decidedAt: '2026-08-27T06:12:04.000Z', override: false },
    ...overrides,
  };
}

describe('HistoryScreen', () => {
  it('renders a row per sealed session with time, document, band, decision, override', async () => {
    fetchHistory.mockResolvedValue([
      makeSession({ sessionId: 'sess-1' }),
      makeSession({
        sessionId: 'sess-2',
        band: 'HOLD',
        documents: [{ id: 'doc-2', type: 'VISA', imageUrl: '', views: {}, fields: [], risk: 90 }],
        officerDecision: { decision: 'REFER', note: 'escalated', decidedAt: '2026-08-27T07:00:00.000Z', override: true },
      }),
    ]);

    const { HistoryScreen } = await import('./HistoryScreen');
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByText('PASSPORT')).toBeInTheDocument();
    expect(screen.getByText('VISA')).toBeInTheDocument();
    expect(screen.getByText('HOLD')).toBeInTheDocument();
    expect(screen.getByText('Refer')).toBeInTheDocument();
    expect(screen.getByText('override')).toBeInTheDocument();
  });

  it('the override-only filter hides non-override rows', async () => {
    fetchHistory.mockResolvedValue([
      makeSession({ sessionId: 'sess-1', documents: [{ id: 'd1', type: 'PASSPORT', imageUrl: '', views: {}, fields: [], risk: 3 }] }),
      makeSession({
        sessionId: 'sess-2',
        documents: [{ id: 'd2', type: 'NATIONAL_ID', imageUrl: '', views: {}, fields: [], risk: 90 }],
        officerDecision: { decision: 'REFER', note: 'x', decidedAt: '2026-08-27T07:00:00.000Z', override: true },
      }),
    ]);

    const { HistoryScreen } = await import('./HistoryScreen');
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByText('PASSPORT')).toBeInTheDocument();
    expect(screen.getByText('NATIONAL_ID')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Override only'));

    expect(screen.queryByText('PASSPORT')).not.toBeInTheDocument();
    expect(screen.getByText('NATIONAL_ID')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no sealed sessions yet', async () => {
    fetchHistory.mockResolvedValue([]);

    const { HistoryScreen } = await import('./HistoryScreen');
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No sealed sessions yet.')).toBeInTheDocument();
  });
});
