/** Shared band -> colour mapping for anything that renders a SystemBand or
 *  Decision value with colour (charts included) — the single source of
 *  truth so a HOLD bar in DashboardScreen uses the exact same `--hold` CSS
 *  custom property as RiskVerdict's glyph, SeverityChip's border, and
 *  every other HOLD indicator in the app, in both themes automatically
 *  (CSS variables, not resolved hex — the SVG re-paints on `data-theme`
 *  changes with no JS involved).
 *
 *  REFER (a Decision value, never a SystemBand) has no dedicated verdict
 *  token — DecisionBar itself renders all four decision buttons neutrally,
 *  no per-decision colour — so it stays neutral here too (`--steel-200`)
 *  rather than borrowing --abstain's colour and implying a relationship
 *  that doesn't exist (ABSTAIN and REFER are unrelated states: system
 *  abstaining vs. an officer's own referral). */
export const BAND_COLOR_VAR: Record<string, string> = {
  CLEAR: 'var(--clear)',
  SECONDARY: 'var(--secondary)',
  HOLD: 'var(--hold)',
  ABSTAIN: 'var(--abstain)',
  RECAPTURE: 'var(--recapture)',
  REFER: 'var(--steel-200)',
};

export function bandColorVar(band: string): string {
  return BAND_COLOR_VAR[band] ?? 'var(--steel-400)';
}
