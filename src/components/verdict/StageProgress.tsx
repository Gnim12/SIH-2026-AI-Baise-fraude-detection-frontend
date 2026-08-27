import type { ScreeningEvent } from '../../types/screening';

/** Stages that matter before 'decision' resolves the verdict. 'received'
 *  just establishes the session; it isn't a progress pip on its own. */
const STAGES: Array<{ key: ScreeningEvent['stage']; label: string }> = [
  { key: 'quality', label: 'Quality' },
  { key: 'classified', label: 'Classify' },
  { key: 'ocr', label: 'OCR' },
  { key: 'face', label: 'Face' },
  { key: 'database', label: 'Database' },
  { key: 'forensics', label: 'Forensics' },
  { key: 'crossdoc', label: 'Cross-doc' },
];

interface StageProgressProps {
  stagesSeen: ReadonlySet<string>;
}

/** Shown in the verdict slot before 'decision' arrives. No spinner, no
 *  provisional risk number — just which stages have landed. */
export function StageProgress({ stagesSeen }: StageProgressProps) {
  return (
    <ol className="flex items-center gap-3" aria-label="screening progress">
      {STAGES.map(({ key, label }) => {
        const filled = stagesSeen.has(key);
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${filled ? 'bg-steel-200' : 'bg-shell-600'}`}
            />
            <span className="text-scale-1 text-steel-400">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
