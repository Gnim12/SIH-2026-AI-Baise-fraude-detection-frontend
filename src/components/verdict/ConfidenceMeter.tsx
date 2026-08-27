const SEGMENTS = 10;

interface ConfidenceMeterProps {
  confidence: number | null;
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  if (confidence === null) return null;

  const filled = Math.round(confidence * SEGMENTS);

  return (
    <div className="flex items-center gap-2 text-scale-2 text-steel-400">
      <span className="text-eyebrow">confidence</span>
      <span aria-hidden="true" className="font-mono">
        {'▓'.repeat(filled)}
        {'░'.repeat(SEGMENTS - filled)}
      </span>
      <span className="font-mono text-steel-200">{confidence.toFixed(2)}</span>
    </div>
  );
}
