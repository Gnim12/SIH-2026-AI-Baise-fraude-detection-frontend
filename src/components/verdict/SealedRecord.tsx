import type { ScreeningSession } from '../../types/screening';
import { formatTimestamp } from '../../lib/time';

const DECISION_LABEL: Record<string, string> = {
  CLEAR: 'Clear',
  SECONDARY: 'Secondary',
  HOLD: 'Hold',
  REFER: 'Refer',
};

interface SealedRecordProps {
  session: ScreeningSession;
}

/** SessionDetail's read-only replacement for DecisionBar (§5.5): "the
 *  sealed record (decision, note, officer, timestamp, model versions from
 *  the session)". The session contract has no dedicated ML-model-version
 *  field (see the CONTRACT GAP comment on ScreeningSession in
 *  types/screening.ts), so "model versions" is shown as each document's own template
 *  version (`ScreenedDocument.version`) — the closest real, non-invented
 *  data the session carries (§7 rule 9: never invent data that isn't
 *  there) — alongside the per-stage timings that are genuinely present. */
export function SealedRecord({ session }: SealedRecordProps) {
  const decision = session.officerDecision;
  if (!decision) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-shell-600 bg-shell-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-eyebrow text-steel-400">Sealed</span>
        <span
          className={`rounded px-2 py-1 text-scale-3 font-semibold text-steel-200 ${
            decision.override ? 'bg-hold-badge' : 'bg-shell-700'
          }`}
        >
          {DECISION_LABEL[decision.decision] ?? decision.decision}
        </span>
        {decision.override && (
          <span className="rounded bg-hold-badge px-1.5 py-0.5 text-scale-1 text-hold">override</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-scale-3 text-steel-400">
        <span>{session.officerId || 'unknown officer'}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono">{formatTimestamp(decision.decidedAt)}</span>
      </div>

      {decision.note && (
        <p className="w-full text-scale-3 text-steel-200">
          <span className="text-steel-400">note: </span>
          {decision.note}
        </p>
      )}

      {session.documents.length > 0 && (
        <p className="w-full font-mono text-scale-1 text-steel-400">
          {session.documents
            .map((d) => `${d.type.toLowerCase()}${d.version ? ` ${d.version}` : ''}`)
            .join(' · ')}
          {session.timingMs.total !== undefined ? ` · ${(session.timingMs.total / 1000).toFixed(2)} s` : ''}
        </p>
      )}
    </div>
  );
}
