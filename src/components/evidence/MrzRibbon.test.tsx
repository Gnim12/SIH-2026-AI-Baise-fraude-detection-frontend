import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MrzRibbon } from './MrzRibbon';
import type { MrzLine, Signal } from '../../types/screening';

// Lifted verbatim from mock/fixtures/case-03-modified-dob.json's ocr event.
const LINES: MrzLine[] = [
  { text: 'P<INDDUPONT<<JEAN<<<<<<<<<<<<<<<<<<<<<<<<<<<', groups: [] },
  {
    text: 'L898902C36IND7408127F1204159ZE184226B<<<<<10',
    groups: [
      { name: 'doc_number', start: 0, end: 9, checkDigitIndex: 9, valid: true },
      {
        name: 'birth_date',
        start: 13,
        end: 19,
        checkDigitIndex: 19,
        valid: false,
        expected: '4',
        read: '7',
        signalId: 'sig-mrz-dob',
      },
      { name: 'expiry_date', start: 21, end: 27, checkDigitIndex: 27, valid: true },
    ],
  },
];

const SIGNALS: Signal[] = [
  {
    id: 'sig-mrz-dob',
    code: 'MRZ_CHECKDIGIT_DOB',
    module: 'validation',
    severity: 'high',
    weight: 30,
    detail: 'MRZ check digit for date of birth does not match.',
    region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    convergenceGroup: 'dob-region',
  },
  {
    id: 'sig-tamper-dob',
    code: 'TAMPER_ELA_DOB',
    module: 'tamper',
    severity: 'critical',
    weight: 28,
    detail: 'Error-level analysis shows a localized anomaly over the date of birth.',
    region: { x: 0.08, y: 0.55, w: 0.22, h: 0.05, documentId: 'doc-1' },
    convergenceGroup: 'dob-region',
  },
];

describe('MrzRibbon (case-03)', () => {
  it('renders a fail glyph and an "expected X, read Y" tooltip for the failing birth_date group, via the direct signalId link', () => {
    render(<MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines: LINES }} signals={SIGNALS} />);

    const dobButton = document.querySelector('[data-group-name="birth_date"]') as HTMLButtonElement;
    expect(dobButton).toBeTruthy();
    expect(dobButton.textContent).toContain('✗');
    expect(dobButton.title).toBe('expected 4, read 7');
    expect(dobButton.disabled).toBe(false);
  });

  it('renders a pass glyph for valid groups and disables them (nothing to explain)', () => {
    render(<MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines: LINES }} signals={SIGNALS} />);

    const docNumberButton = document.querySelector('[data-group-name="doc_number"]') as HTMLButtonElement;
    const expiryButton = document.querySelector('[data-group-name="expiry_date"]') as HTMLButtonElement;
    expect(docNumberButton.textContent).toContain('✓');
    expect(expiryButton.textContent).toContain('✓');
    expect(docNumberButton.disabled).toBe(true);
    expect(expiryButton.disabled).toBe(true);
  });

  it('clicking the failing group fires the signal looked up directly via group.signalId', () => {
    const onGroupSelect = vi.fn();
    render(
      <MrzRibbon
        mrz={{ format: 'TD3', status: 'VERIFIED', lines: LINES }}
        signals={SIGNALS}
        onGroupSelect={onGroupSelect}
      />,
    );

    const dobButton = document.querySelector('[data-group-name="birth_date"]') as HTMLButtonElement;
    fireEvent.click(dobButton);

    expect(onGroupSelect).toHaveBeenCalledTimes(1);
    expect(onGroupSelect.mock.calls[0][0].id).toBe('sig-mrz-dob');
  });

  it('falls back to the linked signal\'s detail when expected/read are absent', () => {
    const lines: MrzLine[] = [
      {
        text: 'AAAAAAAAA9',
        groups: [{ name: 'doc_number', start: 0, end: 9, checkDigitIndex: 9, valid: false, signalId: 'sig-x' }],
      },
    ];
    const signals: Signal[] = [
      {
        id: 'sig-x',
        code: 'MRZ_CHECKDIGIT_DOC_NUMBER',
        module: 'validation',
        severity: 'high',
        weight: 20,
        detail: 'Document number check digit does not match.',
      },
    ];
    render(<MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines }} signals={signals} />);

    const button = document.querySelector('[data-group-name="doc_number"]') as HTMLButtonElement;
    expect(button.title).toBe('Document number check digit does not match.');
  });

  it('falls back to a labelled message when a failing group has no signalId and no expected/read', () => {
    const lines: MrzLine[] = [
      {
        text: 'AAAAAAAAA9',
        groups: [{ name: 'doc_number', start: 0, end: 9, checkDigitIndex: 9, valid: false }],
      },
    ];
    render(<MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines }} signals={[]} />);

    const button = document.querySelector('[data-group-name="doc_number"]') as HTMLButtonElement;
    expect(button.title).toMatch(/no correlated signal detail available/);
  });

  it('renders every line, including the one with no groups (name/given-names line)', () => {
    render(<MrzRibbon mrz={{ format: 'TD3', status: 'VERIFIED', lines: LINES }} signals={SIGNALS} />);
    expect(screen.getByText('Machine-readable zone')).toBeInTheDocument();
  });
});
