interface StatCalloutProps {
  label: string;
  value: string;
  /** Verdict-semantic colour class (e.g. 'text-hold') for when the number
   *  itself carries a band meaning (override rate, convergence rate).
   *  Omit for a neutral stat (session counts, sample sizes). */
  colorClass?: string;
  sublabel?: string;
}

/** The numeric-callout register used throughout the app (RiskVerdict's risk
 *  number, ConfidenceMeter) — mono numerals, an uppercase eyebrow label,
 *  not a recharts-generated stat card. */
export function StatCallout({ label, value, colorClass, sublabel }: StatCalloutProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-eyebrow text-steel-400">{label}</span>
      <span className={`font-mono text-scale-5 ${colorClass ?? 'text-steel-200'}`}>{value}</span>
      {sublabel && <span className="text-scale-1 text-steel-400">{sublabel}</span>}
    </div>
  );
}
