interface RecaptureTakeoverProps {
  reason?: string;
  hint?: string;
}

/** §5.1: "RECAPTURE is a full takeover. If quality.ok === false, the entire
 *  left column is replaced by the rescan instruction — the specific defect
 *  and the hint, in Archivo at 1.5rem. No risk number, no findings, no
 *  fields. The officer needs one instruction, not a partial analysis."
 *  LaneScreen swaps its entire content area (both columns) for this when
 *  a recapture is in effect, rather than rendering findings/fields/face/etc
 *  panels that never got evidence to populate them. */
export function RecaptureTakeover({ reason, hint }: RecaptureTakeoverProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
      <span aria-hidden="true" className="text-scale-6 leading-none text-recapture">
        ○
      </span>
      <p className="text-recapture-instruction text-recapture">Rescan required</p>
      {reason && <p className="max-w-xl text-scale-4 text-steel-200">{reason}</p>}
      {hint && <p className="max-w-xl text-scale-3 text-steel-400">{hint}</p>}
    </div>
  );
}
