import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityGraphPanel } from './IdentityGraphPanel';
import type { GraphResult } from '../../types/screening';

describe('IdentityGraphPanel', () => {
  it('renders "no graph data" when graph is null (module never ran)', () => {
    render(<IdentityGraphPanel graph={null} />);
    expect(screen.getByText('No graph data.')).toBeInTheDocument();
    expect(screen.queryByText('No prior encounters.')).not.toBeInTheDocument();
    expect(screen.queryByText(/0 prior encounters/)).not.toBeInTheDocument();
  });

  it('renders "0 prior encounters" / "No prior encounters." when graph ran and genuinely found none — distinct DOM from the null case', () => {
    const graph: GraphResult = { priorEncounters: [], conflicts: 0, impossibleTravel: false };
    render(<IdentityGraphPanel graph={graph} />);

    expect(screen.getByText('0 prior encounters')).toBeInTheDocument();
    expect(screen.getByText('No prior encounters.')).toBeInTheDocument();
    expect(screen.queryByText('No graph data.')).not.toBeInTheDocument();
  });

  it('gives a conflicting encounter distinct styling from a clean one (case-07 multiple identities)', () => {
    const graph: GraphResult = {
      priorEncounters: [
        {
          sessionId: 's1',
          timestamp: '2026-01-01T00:00:00Z',
          checkpoint: 'IGI-T3',
          nameOnDocument: 'JEAN DUPONT',
          documentNumber: 'L898902C3',
          faceSimilarity: 0.91,
          conflict: false,
        },
        {
          sessionId: 's2',
          timestamp: '2026-02-01T00:00:00Z',
          checkpoint: 'IGI-T2',
          nameOnDocument: 'MARC DUPONT',
          documentNumber: 'X123456Y',
          faceSimilarity: 0.9,
          conflict: true,
        },
      ],
      conflicts: 1,
      impossibleTravel: false,
    };
    render(<IdentityGraphPanel graph={graph} />);

    const conflictLabels = screen.getAllByText('conflict');
    expect(conflictLabels).toHaveLength(1);
    expect(conflictLabels[0].closest('div')?.className).toContain('border-hold');
  });
});
