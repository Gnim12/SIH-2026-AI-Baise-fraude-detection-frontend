import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ScreeningEvent } from '../types/screening';

// M5 §3/§4: "walk all 15 fixtures through the actual running app." No
// browser automation tool is connected in this environment (confirmed via
// mcp__claude-in-chrome__tabs_context_mcp returning "extension not
// connected"), so this file is the substitute: it mounts the REAL
// LaneScreen against the REAL fixture JSON on disk (not hand-typed event
// data), for the cases whose "must prove" fact per §6 is a DOM/rendering
// behavior rather than a session-data shape (those are covered instead,
// for all 15 cases, by src/integration/fixtures.test.ts against the real
// server). This is not a substitute for an actual visual walkthrough —
// it proves the component tree renders correctly, not that it looks right.
vi.mock('../api/client', () => ({
  fetchCases: vi.fn().mockResolvedValue([]),
  startScreening: vi.fn().mockResolvedValue({ sessionId: 'sess-walkthrough' }),
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
  const fixture = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    tape: Array<{ event: ScreeningEvent }>;
  };
  return fixture.tape.map((t) => t.event);
}

async function mountAndReplay(caseId: string) {
  capturedOnEvent = null;
  const { LaneScreen } = await import('./LaneScreen');
  render(
    <MemoryRouter>
      <LaneScreen />
    </MemoryRouter>,
  );
  await act(async () => {});
  expect(capturedOnEvent).not.toBeNull();

  for (const event of loadTape(caseId)) {
    await act(async () => {
      capturedOnEvent?.(event);
    });
  }
}

describe('LaneScreen walkthrough against real fixture files (no browser tool available)', () => {
  it('case-00: RECAPTURE is a full takeover — rescan instruction only, no risk number, no findings, no fields anywhere in the DOM', async () => {
    await mountAndReplay('case-00-bad-capture');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Rescan required')).toBeInTheDocument();
    expect(screen.getByText('Glare across the machine-readable zone.')).toBeInTheDocument();
    expect(screen.getByText(/Remove the document from its cover/)).toBeInTheDocument();

    // None of the normal panels are in the tree at all.
    expect(screen.queryByText('Findings')).not.toBeInTheDocument();
    expect(screen.queryByText('Extracted fields')).not.toBeInTheDocument();
    expect(screen.queryByText('Face')).not.toBeInTheDocument();
    expect(screen.queryByText('Identity graph')).not.toBeInTheDocument();

    // No digit anywhere in the document body (no score in any form).
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('case-07: a real GraphResult with a conflicting encounter flows end-to-end into IdentityGraphPanel', async () => {
    await mountAndReplay('case-07-multiple-identities');

    const section = screen.getByRole('heading', { level: 2, name: 'Identity graph' }).closest('div') as HTMLElement;
    expect(within(section).getByText('2 prior encounters')).toBeInTheDocument();
    expect(within(section).getByText('1 conflicts')).toBeInTheDocument();
    expect(within(section).getByText('MARC LEBLANC')).toBeInTheDocument();
    expect(within(section).getByText('conflict')).toBeInTheDocument();
  });

  it('case-08: face.similarity null with padVerdict spoof renders per the M4 null-similarity rule, unmodified', async () => {
    await mountAndReplay('case-08-presentation-attack');

    const section = screen.getByRole('heading', { level: 2, name: 'Face' }).closest('div') as HTMLElement;
    expect(within(section).getByText('SPOOF DETECTED')).toBeInTheDocument();
    expect(within(section).getByText('PAD: spoof')).toBeInTheDocument();
    // No similarity bar glyphs, no "x.xx / y.yy" numeral anywhere in this section.
    expect(section.textContent).not.toMatch(/[▓░]/);
    expect(section.textContent).not.toMatch(/\d\.\d\d\s*\/\s*\d\.\d\d/);
  });

  it('case-13: the REAL fixture file — both document tabs clean AND CrossDocumentPanel carries the finding, in one rendered tree', async () => {
    await mountAndReplay('case-13-visa-transplant');

    // Scope to the Cross-document section (its own h3 also says
    // "Cross-document" with a count badge appended, which is why the
    // component-level test used getByRole to disambiguate from that h3 —
    // same technique here).
    const section = screen
      .getByRole('heading', { level: 2, name: 'Cross-document' })
      .closest('div') as HTMLElement;

    // Fact 1: the cross-document finding from the real fixture is visible.
    const finding = 'The visa portrait does not match the passport portrait for the same declared identity.';
    expect(within(section).getByText(finding)).toBeInTheDocument();

    // Fact 2: the active tab (passport, first document classified) is clean
    // — present in the SAME tree as fact 1, not a separate render.
    expect(within(section).getByText('No findings.')).toBeInTheDocument();

    // Fact 2, continued: the other document tab (visa) is also clean.
    fireEvent.click(within(section).getByText('VISA'));
    expect(within(section).getByText('No findings.')).toBeInTheDocument();

    // The finding never depended on which tab was active.
    expect(within(section).getByText(finding)).toBeInTheDocument();
  });

  it('case-14: face never arrives — CoverageBanner renders the no_biometric sentence and no Face panel content claims a result', async () => {
    await mountAndReplay('case-14-module-failure');

    expect(
      screen.getByText('Screened without biometric verification — face module did not complete.'),
    ).toBeInTheDocument();

    const section = screen.getByRole('heading', { level: 2, name: 'Face' }).closest('div') as HTMLElement;
    expect(within(section).getByText('No face data.')).toBeInTheDocument();
  });
});
