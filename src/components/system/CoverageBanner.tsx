// Real gap catalogue should come from the backend eventually (§5.6's
// coverageFlags is typed as string[] precisely because the full list isn't
// fixed yet); this map covers the flags exercised so far and falls back to
// a generic-but-still-plain sentence for anything unrecognised.
const COVERAGE_COPY: Record<string, string> = {
  no_biometric: 'Screened without biometric verification — face module did not complete.',
  stale_watchlist: 'Screened against a stale watchlist — database sync did not complete in time.',
};

function copyFor(flag: string): string {
  return COVERAGE_COPY[flag] ?? `Screened with a coverage gap: ${flag.replace(/_/g, ' ')}.`;
}

interface CoverageBannerProps {
  coverageFlags: string[];
}

/** Renders only when there is a gap. Copy is a plain statement of the gap,
 *  never reassuring language (§5.6). Sits directly above DecisionBar. */
export function CoverageBanner({ coverageFlags }: CoverageBannerProps) {
  if (coverageFlags.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-t border-secondary/40 bg-secondary/10 px-4 py-2">
      {coverageFlags.map((flag) => (
        <p key={flag} className="flex items-center gap-2 text-scale-3 text-secondary">
          <span aria-hidden="true">⚠</span>
          <span>{copyFor(flag)}</span>
        </p>
      ))}
    </div>
  );
}
