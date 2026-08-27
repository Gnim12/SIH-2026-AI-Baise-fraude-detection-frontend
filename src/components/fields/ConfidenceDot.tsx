/** Below this, a field's confidence is flagged as low (§5's own mock:
 *  "1990-04-12   0.62 ⚠"). Chosen well below the 0.97+ values genuine
 *  fixtures use, so clean fields never false-positive. */
export const LOW_CONFIDENCE_THRESHOLD = 0.75;

interface ConfidenceDotProps {
  confidence: number;
}

/** Pure "is this low?" indicator — colour is never the only signal, the
 *  caller (FieldRow) renders the numeral and the ⚠ glyph alongside it. */
export function ConfidenceDot({ confidence }: ConfidenceDotProps) {
  const low = confidence < LOW_CONFIDENCE_THRESHOLD;
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 rounded-full ${low ? 'bg-secondary' : 'bg-clear'}`}
    />
  );
}
