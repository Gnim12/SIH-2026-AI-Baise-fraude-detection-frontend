import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FindingsList } from './FindingsList';
import type { Signal } from '../../types/screening';

// The convergence cluster from case-03-modified-dob: 3 modules agreeing on
// one region, plus one unrelated info-severity signal.
const region = { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' };

const signals: Signal[] = [
  {
    id: 'sig-mrz-dob',
    code: 'MRZ_CHECKDIGIT_DOB',
    module: 'validation',
    severity: 'high',
    weight: 30,
    detail: 'MRZ check digit for date of birth does not match.',
    region,
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-font-dob',
    code: 'FONT_MISMATCH_DOB',
    module: 'template',
    severity: 'high',
    weight: 22,
    detail: 'Font in date of birth field does not match the document template.',
    region,
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-tamper-dob',
    code: 'TAMPER_ELA_DOB',
    module: 'tamper',
    severity: 'critical',
    weight: 28,
    detail: 'Error-level analysis shows a localized anomaly over the date of birth.',
    region,
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

describe('FindingsList convergence grouping (case-03)', () => {
  it('renders the 3-signal cluster as one grouped row, not 3+ separate rows', () => {
    const { container } = render(<FindingsList signals={signals} />);

    // Exactly one badge announcing the convergence.
    expect(screen.getByText('3 modules agree on this region')).toBeInTheDocument();

    // Top-level list has 2 rows: the group and the unrelated info signal —
    // not 4 flat rows.
    const topLevelList = container.querySelector('ul');
    expect(topLevelList).not.toBeNull();
    const topLevelItems = topLevelList!.querySelectorAll(':scope > li');
    expect(topLevelItems).toHaveLength(2);

    // All 3 member signals are still present, nested beneath the group.
    expect(screen.getByText(/MRZ check digit for date of birth/)).toBeInTheDocument();
    expect(screen.getByText(/Font in date of birth field/)).toBeInTheDocument();
    expect(screen.getByText(/Error-level analysis/)).toBeInTheDocument();
  });

  it('gives the group row a --hold left rule', () => {
    render(<FindingsList signals={signals} />);
    const groupRow = screen.getByText('3 modules agree on this region').closest('li');
    expect(groupRow?.className).toContain('border-hold');
  });

  it('sorts the info-severity row last regardless of weight', () => {
    render(<FindingsList signals={signals} />);
    const rowTexts = screen
      .getAllByRole('button')
      .map((btn) => btn.textContent ?? '');
    // The group's badge isn't a button; only the "No watchlist match" info
    // row and the group members are. The info row's own button should be
    // the last one rendered.
    const lastButtonText = rowTexts[rowTexts.length - 1];
    expect(lastButtonText).toMatch(/No watchlist match/);
  });

  it('shows an empty state with no signals', () => {
    render(<FindingsList signals={[]} />);
    expect(screen.getByText('No findings.')).toBeInTheDocument();
  });
});
