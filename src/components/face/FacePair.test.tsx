import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacePair } from './FacePair';
import type { FaceResult } from '../../types/screening';

describe('FacePair', () => {
  it('renders no similarity bar or numeral when similarity is null (case-08 presentation attack)', () => {
    const face: FaceResult = {
      status: 'SPOOF',
      similarity: null,
      threshold: 0.7,
      padVerdict: 'spoof',
    };
    const { container } = render(<FacePair face={face} />);

    expect(screen.getByText('SPOOF DETECTED')).toBeInTheDocument();
    // No bar glyphs and no digit anywhere in the DOM for a null similarity.
    expect(container.textContent).not.toMatch(/[▓░]/);
    expect(container.textContent).not.toMatch(/\d\.\d\d/);
  });

  it('renders no similarity bar or numeral when similarity is null (case-10-style UNAVAILABLE)', () => {
    const face: FaceResult = {
      status: 'UNAVAILABLE',
      similarity: null,
      threshold: 0.7,
      padVerdict: 'not_run',
    };
    const { container } = render(<FacePair face={face} />);

    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[▓░]/);
  });

  it('renders the bar and numeral when similarity is present (case-06 impersonation)', () => {
    const face: FaceResult = {
      status: 'MISMATCH',
      similarity: 0.24,
      threshold: 0.7,
      padVerdict: 'live',
    };
    render(<FacePair face={face} />);

    expect(screen.getByText('0.24 / 0.70')).toBeInTheDocument();
  });

  it('renders "no face data" when face is null (case-14 module failure)', () => {
    render(<FacePair face={null} />);
    expect(screen.getByText('No face data.')).toBeInTheDocument();
  });
});
