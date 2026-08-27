import type { ScreenedDocument } from '../../types/screening';

export type ViewKey = keyof ScreenedDocument['views'];

const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: 'rgb', label: 'RGB' },
  { key: 'ela', label: 'ELA' },
  { key: 'noise', label: 'Noise' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'fft', label: 'FFT' },
];

interface ViewToggleProps {
  views: ScreenedDocument['views'];
  active: ViewKey;
  onChange: (view: ViewKey) => void;
}

/** RGB/ELA/Noise/Heatmap/FFT toggle. A view absent from `document.views` is
 *  disabled with a tooltip explaining why — never hidden, because absence
 *  of a view is itself information (§5.3). */
export function ViewToggle({ views, active, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Document view">
      {VIEWS.map(({ key, label }) => {
        const available = Boolean(views[key]);
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            disabled={!available}
            title={available ? undefined : `${label} view not available for this document`}
            aria-pressed={isActive}
            onClick={() => available && onChange(key)}
            className={`rounded border px-2 py-1 text-scale-2 uppercase tracking-wide transition-colors ${
              !available
                ? 'cursor-not-allowed border-shell-700 text-steel-400/50'
                : isActive
                  ? 'border-steel-200 bg-shell-700 text-steel-200'
                  // hover:text-steel-300, not -400: hover turns the
                  // background --shell-700, where --steel-400 fails contrast.
                  : 'border-shell-600 text-steel-400 hover:bg-shell-700 hover:text-steel-300'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
