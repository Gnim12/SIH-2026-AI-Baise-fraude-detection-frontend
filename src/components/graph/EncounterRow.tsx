import type { Encounter } from '../../types/screening';

interface EncounterRowProps {
  encounter: Encounter;
}

/** A conflicting encounter (same face, different identity) gets distinct
 *  styling from an ordinary prior encounter — border/tint + an explicit
 *  label, never colour alone (§4). */
export function EncounterRow({ encounter }: EncounterRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1.5 text-scale-3 ${
        encounter.conflict ? 'border-l-4 border-hold' : ''
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-steel-200">{encounter.nameOnDocument}</span>
        <span className="shrink-0 text-scale-1 text-steel-400">{encounter.checkpoint}</span>
        {encounter.conflict && (
          <span className="shrink-0 rounded bg-hold-badge px-1 py-0.5 text-scale-1 text-hold">
            conflict
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono text-steel-400">
        {new Date(encounter.timestamp).toLocaleDateString()}
      </span>
    </div>
  );
}
