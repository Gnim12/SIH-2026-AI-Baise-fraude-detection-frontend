import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CrossDocumentPanel } from './CrossDocumentPanel';
import type { ScreenedDocument, Signal } from '../../types/screening';

// Inline mock for case-13-style visa transplant: both documents individually
// clean (empty per-document signals), but a non-empty crossDocumentSignals
// array carries the finding. No real fixture exists yet — that's M5.
const DOCUMENTS: ScreenedDocument[] = [
  { id: 'doc-passport', type: 'PASSPORT', imageUrl: '/a.svg', views: {}, fields: [], risk: 2 },
  { id: 'doc-visa', type: 'VISA', imageUrl: '/b.svg', views: {}, fields: [], risk: 3 },
];

const CROSS_DOC_SIGNALS: Signal[] = [
  {
    id: 'sig-visa-transplant',
    code: 'CROSSDOC_PHOTO_TRANSPLANT',
    module: 'crossdoc',
    severity: 'critical',
    weight: 40,
    detail: 'Visa portrait does not match the passport portrait for the same identity.',
  },
];

describe('CrossDocumentPanel', () => {
  it('renders the cross-document finding while both document tabs show clean (case-13 shape)', () => {
    render(<CrossDocumentPanel documents={DOCUMENTS} signals={[]} crossDocumentSignals={CROSS_DOC_SIGNALS} />);

    // Cross-doc section carries the finding.
    expect(screen.getByText(CROSS_DOC_SIGNALS[0].detail)).toBeInTheDocument();
    expect(screen.getByText('1 finding')).toBeInTheDocument();

    // Active tab (passport, first document) is clean.
    expect(screen.getByText('No findings.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('VISA'));
    // Visa tab is also clean.
    expect(screen.getByText('No findings.')).toBeInTheDocument();

    // The cross-doc finding is never duplicated into the per-document list.
    expect(screen.getAllByText(CROSS_DOC_SIGNALS[0].detail)).toHaveLength(1);
  });

  it('renders "No cross-document findings." when crossDocumentSignals is empty', () => {
    render(<CrossDocumentPanel documents={DOCUMENTS} signals={[]} crossDocumentSignals={[]} />);
    expect(screen.getByText('No cross-document findings.')).toBeInTheDocument();
  });
});
