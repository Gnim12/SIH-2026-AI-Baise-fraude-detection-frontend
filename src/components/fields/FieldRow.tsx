import type { ExtractedField } from '../../types/screening';
import { ConfidenceDot, LOW_CONFIDENCE_THRESHOLD } from './ConfidenceDot';

interface FieldRowProps {
  field: ExtractedField;
}

/** One extracted field. Mismatch (MRZ vs VIZ disagreement) and low
 *  confidence are different facts and must render as different markers —
 *  a field can carry either, both, or neither. */
export function FieldRow({ field }: FieldRowProps) {
  const low = field.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1.5 text-scale-3 ${
        field.mismatch ? 'border-l-4 border-hold bg-hold/5' : ''
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-steel-400">{field.label}</span>
        {field.mismatch && (
          <span
            title="MRZ and VIZ disagree on this field"
            className="shrink-0 rounded bg-hold/20 px-1 py-0.5 text-scale-1 text-hold"
          >
            MRZ≠VIZ
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2 font-mono text-steel-200">
        <span>{field.value}</span>
        <ConfidenceDot confidence={field.confidence} />
        <span className={low ? 'text-secondary' : 'text-steel-400'}>{field.confidence.toFixed(2)}</span>
        {low && (
          <span aria-hidden="true" title={`confidence below ${LOW_CONFIDENCE_THRESHOLD}`} className="text-secondary">
            ⚠
          </span>
        )}
      </span>
    </div>
  );
}
