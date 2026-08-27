import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SessionDetail } from './SessionDetail';
import type { ScreeningSession } from '../types/screening';

const fetchHistoryEntry = vi.fn();
vi.mock('../api/client', () => ({
  fetchHistoryEntry: (...args: unknown[]) => fetchHistoryEntry(...args),
  resolveAssetUrl: (p: string) => p,
}));

const SEALED_SESSION: ScreeningSession = {
  sessionId: 'seed-case-03-modified-dob',
  laneId: 'IGI-T3-LANE-07',
  officerId: 'OFF-2291',
  startedAt: '2026-08-27T06:41:17.000Z',
  band: 'HOLD',
  risk: 80,
  confidence: 0.88,
  abstained: false,
  documents: [
    { id: 'doc-1', type: 'PASSPORT', version: 'v3', imageUrl: '/assets/x.svg', views: {}, fields: [], risk: 80 },
  ],
  signals: [],
  face: null,
  graph: null,
  crossDocumentSignals: [],
  coverageFlags: [],
  timingMs: { total: 1680 },
  sealed: true,
  officerDecision: {
    decision: 'HOLD',
    note: 'Confirmed date-of-birth modification on physical inspection.',
    decidedAt: '2026-08-27T06:41:17.000Z',
    override: false,
  },
};

function renderAt(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/history/${sessionId}`]}>
      <Routes>
        <Route path="/history/:sessionId" element={<SessionDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionDetail', () => {
  it('renders the sealed record — decision, note, officer, timestamp — in place of DecisionBar', async () => {
    fetchHistoryEntry.mockResolvedValue(SEALED_SESSION);

    renderAt('seed-case-03-modified-dob');

    expect(await screen.findByText('Hold')).toBeInTheDocument();
    expect(
      screen.getByText('Confirmed date-of-birth modification on physical inspection.'),
    ).toBeInTheDocument();
    expect(screen.getByText('OFF-2291', { exact: false })).toBeInTheDocument();

    // No editable decision controls anywhere — this is read-only replay.
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('note')).not.toBeInTheDocument();
  });

  it('reuses the same evidence panels as LaneScreen — findings, fields, verdict all present', async () => {
    fetchHistoryEntry.mockResolvedValue(SEALED_SESSION);

    renderAt('seed-case-03-modified-dob');

    expect(await screen.findByRole('heading', { level: 2, name: 'Findings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Extracted fields' })).toBeInTheDocument();
    expect(screen.getByText('HOLD')).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown session id', async () => {
    fetchHistoryEntry.mockResolvedValue(null);

    renderAt('does-not-exist');

    expect(await screen.findByText('Session not found.')).toBeInTheDocument();
  });
});
