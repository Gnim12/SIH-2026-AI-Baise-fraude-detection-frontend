import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ScreeningEvent } from '../types/screening';

/** §8 acceptance: "keyboard-only completion of a full screening, start to
 *  sealed." Drives the REAL LaneScreen (mounted with a real Router, since
 *  it now renders a <Link>) through case-01's real tape using only the
 *  keyboard affordances DecisionBar exposes (1-4 select, Enter submits —
 *  §5.4) and proves the session ends up sealed with no mouse interaction
 *  anywhere in the sequence. */
const submitDecision = vi.fn().mockResolvedValue({});
vi.mock('../api/client', () => ({
  submitDecision: (...args: unknown[]) => submitDecision(...args),
  resolveAssetUrl: (p: string) => p,
}));

let capturedOnEvent: ((event: ScreeningEvent) => void) | null = null;
vi.mock('../api/socket', () => ({
  connectScreeningSocket: vi.fn(({ onEvent }: { onEvent: (event: ScreeningEvent) => void }) => {
    capturedOnEvent = onEvent;
    return { close: vi.fn() };
  }),
}));

const FIXTURES_DIR = path.join(process.cwd(), 'mock', 'fixtures');

function loadTape(caseId: string): ScreeningEvent[] {
  const file = path.join(FIXTURES_DIR, `${caseId}.json`);
  const fixture = JSON.parse(fs.readFileSync(file, 'utf-8')) as { tape: Array<{ event: ScreeningEvent }> };
  return fixture.tape.map((t) => t.event);
}

describe('Keyboard-only completion of a full screening (§8), case-01', () => {
  it('quality -> classified -> ocr -> face -> database -> forensics -> crossdoc -> decision, then 1 + Enter seals CLEAR with no note required', async () => {
    const { LaneScreen } = await import('./LaneScreen');
    render(
      <MemoryRouter initialEntries={['/lane/sess-kb-walkthrough']}>
        <Routes>
          <Route path="/lane/:sessionId" element={<LaneScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {});
    expect(capturedOnEvent).not.toBeNull();

    // Step 1: the tape streams in exactly as the WS would deliver it — no
    // pointer interaction drives this part, it's the mock server's replay.
    for (const event of loadTape('case-01-genuine')) {
      await act(async () => {
        capturedOnEvent?.(event);
      });
    }

    // Step 2: verdict has resolved to CLEAR (the system's own recommendation).
    expect(screen.getByText('CLEAR')).toBeInTheDocument();

    // Step 3: officer selects "1" (Clear) with the keyboard alone — no
    // click on the DecisionBar button.
    fireEvent.keyDown(window, { key: '1' });
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveAttribute('aria-pressed', 'true');

    // Step 4: decision matches the system band, so Submit is already
    // enabled with no note typed — confirms the note-required gate (§5.4)
    // correctly stays off for a non-override, non-HOLD/REFER decision.
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();

    // Step 5: officer presses Enter to seal — still no mouse.
    fireEvent.keyDown(window, { key: 'Enter' });

    // Step 6: the decision was persisted (POST .../decision) and the lane
    // reset for the next traveller (§5.4: "navigate to a clean lane").
    expect(submitDecision).toHaveBeenCalledWith(
      expect.objectContaining({ band: 'CLEAR' }),
      'CLEAR',
      '',
      false,
    );
  });
});
