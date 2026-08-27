import type { Signal } from '../../types/screening';

export type FindingsRow =
  | { kind: 'single'; signal: Signal }
  | { kind: 'group'; groupId: string; members: Signal[] };

function sumWeights(signals: Signal[]): number {
  return signals.reduce((total, s) => total + s.weight, 0);
}

function isInfoRow(row: FindingsRow): boolean {
  if (row.kind === 'single') return row.signal.severity === 'info';
  return row.members.every((m) => m.severity === 'info');
}

function rowWeight(row: FindingsRow): number {
  return row.kind === 'single' ? row.signal.weight : sumWeights(row.members);
}

/** Groups signals sharing a convergenceGroup into one row each; everything
 *  else stays a single row. Sorted by weight descending, 'info' rows last
 *  regardless of weight (§5.2). */
export function buildFindingsRows(signals: Signal[]): FindingsRow[] {
  const groups = new Map<string, Signal[]>();
  const singles: Signal[] = [];

  for (const signal of signals) {
    if (signal.convergenceGroup) {
      const members = groups.get(signal.convergenceGroup) ?? [];
      members.push(signal);
      groups.set(signal.convergenceGroup, members);
    } else {
      singles.push(signal);
    }
  }

  const rows: FindingsRow[] = [
    ...singles.map((signal): FindingsRow => ({ kind: 'single', signal })),
    ...[...groups.entries()].map(
      ([groupId, members]): FindingsRow => ({ kind: 'group', groupId, members }),
    ),
  ];

  return rows.sort((a, b) => {
    const aInfo = isInfoRow(a);
    const bInfo = isInfoRow(b);
    if (aInfo !== bInfo) return aInfo ? 1 : -1;
    return rowWeight(b) - rowWeight(a);
  });
}
