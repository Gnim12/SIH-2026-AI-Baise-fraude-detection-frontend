import type { SystemBand } from '../../types/screening';

const GLYPH: Record<SystemBand, string> = {
  CLEAR: '●', // filled circle
  SECONDARY: '◐', // half-filled circle
  HOLD: '■', // filled square
  ABSTAIN: '⊘', // open circle with slash
  RECAPTURE: '○', // open circle
};

const LABEL: Record<SystemBand, string> = {
  CLEAR: 'CLEAR',
  SECONDARY: 'SECONDARY INSPECTION',
  HOLD: 'HOLD',
  ABSTAIN: 'INSUFFICIENT EVIDENCE',
  RECAPTURE: 'RESCAN REQUIRED',
};

const COLOR_CLASS: Record<SystemBand, string> = {
  CLEAR: 'text-clear',
  SECONDARY: 'text-secondary',
  HOLD: 'text-hold',
  ABSTAIN: 'text-abstain',
  RECAPTURE: 'text-recapture',
};

interface RiskVerdictProps {
  band: SystemBand | null;
  /** null on ABSTAIN and RECAPTURE — render no numeral at all in that case. */
  risk: number | null;
}

export function RiskVerdict({ band, risk }: RiskVerdictProps) {
  if (!band) return null;

  return (
    <div aria-live="polite" className="flex items-baseline gap-4">
      <span aria-hidden="true" className={`text-scale-6 leading-none ${COLOR_CLASS[band]}`}>
        {GLYPH[band]}
      </span>
      <span className={`text-display ${COLOR_CLASS[band]}`}>{LABEL[band]}</span>
      {risk !== null ? (
        <span className="font-mono text-scale-4 text-steel-200">{risk} / 100</span>
      ) : null}
    </div>
  );
}
