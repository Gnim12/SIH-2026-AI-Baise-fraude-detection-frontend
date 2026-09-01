import type { GraphResult } from '../../types/screening';
import { EncounterRow } from './EncounterRow';

interface IdentityGraphPanelProps {
  /** null when the graph module didn't run / no prior data exists — this
   *  is missing evidence, and must render differently from a genuine
   *  first encounter (priorEncounters: []). Conflating the two would hide
   *  the fact that the module never ran (§3, §7 rule 4). */
  graph: GraphResult | null;
}

export function IdentityGraphPanel({ graph }: IdentityGraphPanelProps) {
  if (!graph) {
    return <p className="px-2 py-1.5 text-scale-3 text-steel-400">No graph data.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 px-2 text-scale-2 text-steel-400">
        <span>{graph.priorEncounters.length} prior encounters</span>
        <span className={graph.conflicts > 0 ? 'text-hold' : undefined}>{graph.conflicts} conflicts</span>
        {graph.impossibleTravel && (
          <span className="rounded bg-hold-badge px-1.5 py-0.5 text-hold">impossible travel</span>
        )}
      </div>
      {graph.priorEncounters.length === 0 ? (
        <p className="px-2 py-1.5 text-scale-3 text-steel-400">No prior encounters.</p>
      ) : (
        <div className="divide-y divide-shell-700">
          {graph.priorEncounters.map((encounter) => (
            <EncounterRow key={encounter.sessionId} encounter={encounter} />
          ))}
        </div>
      )}
    </div>
  );
}
