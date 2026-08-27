import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskVerdict } from './RiskVerdict';

describe('RiskVerdict', () => {
  it('renders the ABSTAIN glyph and label with no numeral anywhere in the DOM (case-10)', () => {
    const { container } = render(<RiskVerdict band="ABSTAIN" risk={null} />);

    expect(screen.getByText('INSUFFICIENT EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('⊘')).toBeInTheDocument();

    // Not "0", not "—", not "0/100" — no digit character anywhere at all.
    expect(container.textContent).not.toMatch(/\d/);
    expect(screen.queryByText(/\/\s*100/)).not.toBeInTheDocument();
  });

  it('renders the risk numeral when risk is present (case-01)', () => {
    render(<RiskVerdict band="CLEAR" risk={3} />);
    expect(screen.getByText('3 / 100')).toBeInTheDocument();
  });

  it('renders no numeral for RECAPTURE either', () => {
    const { container } = render(<RiskVerdict band="RECAPTURE" risk={null} />);
    expect(container.textContent).not.toMatch(/\d/);
  });
});
