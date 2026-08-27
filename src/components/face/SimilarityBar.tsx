const SEGMENTS = 10;

interface SimilarityBarProps {
  /** null when FaceResult.status is SPOOF or UNAVAILABLE — in that case
   *  this component renders nothing at all; the caller (FacePair) is
   *  responsible for showing the status instead. Same rule as the
   *  ABSTAIN risk-number guard in RiskVerdict / ConfidenceMeter. */
  similarity: number | null;
  threshold: number;
}

export function SimilarityBar({ similarity, threshold }: SimilarityBarProps) {
  if (similarity === null) return null;

  const filled = Math.round(similarity * SEGMENTS);

  return (
    <div className="flex items-center gap-2 text-scale-2 text-steel-400">
      <span aria-hidden="true" className="font-mono">
        {'▓'.repeat(filled)}
        {'░'.repeat(SEGMENTS - filled)}
      </span>
      <span className="font-mono text-steel-200">
        {similarity.toFixed(2)} / {threshold.toFixed(2)}
      </span>
    </div>
  );
}
