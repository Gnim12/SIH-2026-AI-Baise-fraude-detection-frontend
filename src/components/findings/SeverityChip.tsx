import type { Severity } from '../../types/screening';

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'INFO',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

interface SeverityChipProps {
  severity: Severity;
}

export function SeverityChip({ severity }: SeverityChipProps) {
  return (
    // text-steel-300, not -400: this chip's background is always --shell-700,
    // where --steel-400 fails contrast (4.26:1) — see index.css's :root comment.
    <span className="rounded border border-shell-600 bg-shell-700 px-1.5 py-0.5 text-scale-1 text-steel-300">
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
