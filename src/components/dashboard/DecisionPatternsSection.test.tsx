import { cloneElement, isValidElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DecisionPatterns } from '../../types/dashboard';

// jsdom never lays out real pixel sizes. The real <ResponsiveContainer>
// measures its own box via ResizeObserver and then injects the resulting
// width/height as explicit numeric props onto its chart child (BarChart/
// LineChart don't read CSS themselves) — under jsdom that measurement is
// always 0x0, so nothing ever renders. Replacing ResponsiveContainer with
// a wrapper that clones its child with a fixed width/height reproduces
// what it does in a real browser, letting recharts' real SVG output
// render for real under jsdom — see src/test/setup.ts's ResizeObserver
// polyfill comment.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 400, height: 300 }}>
        {isValidElement(children)
          ? cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, {
              width: 400,
              height: 300,
            })
          : children}
      </div>
    ),
  };
});

const patterns: DecisionPatterns = {
  systemBandByDay: [
    { date: '2026-08-01', counts: { CLEAR: 3, HOLD: 1 } },
    { date: '2026-08-02', counts: { CLEAR: 2, SECONDARY: 1 } },
  ],
  officerDecisionByDay: [
    { date: '2026-08-01', counts: { CLEAR: 3, HOLD: 1 } },
    { date: '2026-08-02', counts: { CLEAR: 2, REFER: 1 } },
  ],
  overrideRatePct: 12.5,
  overridesByDay: [
    { date: '2026-08-01', total: 4, overrides: 1, overrideRatePct: 25 },
    { date: '2026-08-02', total: 3, overrides: 0, overrideRatePct: 0 },
  ],
};

describe('DecisionPatternsSection chart colors', () => {
  it('renders the system-band chart with real --clear/--hold token references, matching RiskVerdict/SeverityChip', async () => {
    const { DecisionPatternsSection } = await import('./DecisionPatternsSection');
    const { container } = render(<DecisionPatternsSection patterns={patterns} />);

    // recharts renders each rendered bar segment as a <path
    // class="recharts-rectangle" name="<dataKey>" fill="...">. Spot-check
    // the two bands the acceptance criteria names explicitly against the
    // exact CSS var() the rest of the app uses (RiskVerdict's COLOR_CLASS,
    // SeverityChip's border-hold), not a resolved hex or recharts' default
    // categorical palette.
    const rects = Array.from(container.querySelectorAll('path.recharts-rectangle'));
    const clearRects = rects.filter((el) => el.getAttribute('name') === 'CLEAR');
    const holdRects = rects.filter((el) => el.getAttribute('name') === 'HOLD');
    expect(clearRects.length).toBeGreaterThan(0);
    expect(holdRects.length).toBeGreaterThan(0);
    clearRects.forEach((el) => expect(el.getAttribute('fill')).toBe('var(--clear)'));
    holdRects.forEach((el) => expect(el.getAttribute('fill')).toBe('var(--hold)'));
    // Explicit timeout (matches src/integration/fixtures.test.ts's own
    // convention): a real recharts SVG render, slow under the full test
    // run's parallel CPU load, can exceed vitest's 5000ms default.
  }, 10000);

  it('the override-rate line uses --hold, the same token as every other adverse indicator', async () => {
    const { DecisionPatternsSection } = await import('./DecisionPatternsSection');
    const { container } = render(<DecisionPatternsSection patterns={patterns} />);
    const line = container.querySelector('.recharts-line-curve');
    expect(line).not.toBeNull();
    expect(line?.getAttribute('stroke')).toBe('var(--hold)');
  }, 10000);
});
