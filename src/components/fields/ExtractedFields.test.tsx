import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExtractedFields } from './ExtractedFields';
import type { ExtractedField } from '../../types/screening';

const baseField: ExtractedField = {
  key: 'birth_date',
  label: 'Date of birth',
  value: '1990-04-12',
  confidence: 0.98,
  source: 'MERGED',
};

describe('ExtractedFields / FieldRow', () => {
  it('renders a low-confidence warning glyph next to the value, with no mismatch marker (case-03 expiry-style low field)', () => {
    const fields: ExtractedField[] = [{ ...baseField, confidence: 0.62 }];
    render(<ExtractedFields fields={fields} />);

    expect(screen.getByText('0.62')).toBeInTheDocument();
    expect(screen.getByText('⚠')).toBeInTheDocument();
    expect(screen.queryByText('MRZ≠VIZ')).not.toBeInTheDocument();
  });

  it('renders a mismatch marker with no low-confidence warning when confidence is high (mismatch-only field)', () => {
    const fields: ExtractedField[] = [{ ...baseField, confidence: 0.98, mismatch: true }];
    render(<ExtractedFields fields={fields} />);

    expect(screen.getByText('MRZ≠VIZ')).toBeInTheDocument();
    expect(screen.queryByText('⚠')).not.toBeInTheDocument();
  });

  it('renders both distinct markers for a field that is both mismatched and low-confidence (case-03 DOB)', () => {
    const fields: ExtractedField[] = [{ ...baseField, confidence: 0.62, mismatch: true }];
    render(<ExtractedFields fields={fields} />);

    expect(screen.getByText('MRZ≠VIZ')).toBeInTheDocument();
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('renders neither marker for a clean, high-confidence field', () => {
    const fields: ExtractedField[] = [{ ...baseField, confidence: 0.99 }];
    render(<ExtractedFields fields={fields} />);

    expect(screen.queryByText('MRZ≠VIZ')).not.toBeInTheDocument();
    expect(screen.queryByText('⚠')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no fields', () => {
    render(<ExtractedFields fields={[]} />);
    expect(screen.getByText('No fields extracted.')).toBeInTheDocument();
  });
});
