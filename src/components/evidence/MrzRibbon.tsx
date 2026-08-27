import type { MrzLine, ScreenedDocument, Signal } from '../../types/screening';

interface MrzRibbonProps {
  mrz: NonNullable<ScreenedDocument['mrz']>;
  /** All signals for the owning document — looked up by group.signalId. */
  signals: Signal[];
  onGroupSelect?: (signal: Signal) => void;
}

const HOLD_TINT = 'rgba(209, 67, 86, 0.12)'; // --hold at 12% opacity, per §4

function MrzLineRow({
  line,
  signals,
  onGroupSelect,
}: {
  line: MrzLine;
  signals: Signal[];
  onGroupSelect?: (signal: Signal) => void;
}) {
  const chars = line.text.split('');

  return (
    <div
      className="grid font-mono text-scale-4 leading-none text-canvas-ink"
      style={{ gridTemplateColumns: `repeat(${chars.length}, 1ch)`, gridTemplateRows: 'auto 6px auto' }}
    >
      {line.groups
        .filter((g) => !g.valid)
        .map((g) => (
          <span
            key={`bg-${g.name}`}
            aria-hidden="true"
            style={{ gridColumn: `${g.start + 1} / ${g.end + 1}`, gridRow: 1, backgroundColor: HOLD_TINT }}
          />
        ))}

      {chars.map((ch, i) => {
        const group = line.groups.find((g) => i >= g.start && i < g.end);
        const checkDigitGroup = line.groups.find((g) => g.checkDigitIndex === i);
        const isCheckDigit = Boolean(checkDigitGroup);
        const invalid = Boolean((group && !group.valid) || (checkDigitGroup && !checkDigitGroup.valid));
        return (
          <span
            key={i}
            style={{ gridColumn: i + 1, gridRow: 1, color: invalid ? 'var(--hold)' : undefined }}
            className={isCheckDigit ? 'font-semibold' : undefined}
          >
            {ch}
          </span>
        );
      })}

      {line.groups.map((g) => (
        <span
          key={`ul-${g.name}`}
          aria-hidden="true"
          style={{
            gridColumn: `${g.start + 1} / ${g.end + 1}`,
            gridRow: 2,
            borderTop: `2px solid ${g.valid ? 'var(--canvas-rule)' : 'var(--hold)'}`,
          }}
        />
      ))}

      {line.groups.map((g) => {
        const matched = g.signalId ? signals.find((s) => s.id === g.signalId) ?? null : null;
        const tooltip = g.valid
          ? undefined
          : g.expected !== undefined && g.read !== undefined
            ? `expected ${g.expected}, read ${g.read}`
            : (matched?.detail ??
              `${g.name.replace(/_/g, ' ')}: check digit failed — no correlated signal detail available`);
        return (
          <button
            key={`label-${g.name}`}
            type="button"
            data-group-name={g.name}
            data-valid={g.valid}
            disabled={g.valid}
            title={tooltip}
            onClick={() => matched && onGroupSelect?.(matched)}
            style={{ gridColumn: `${g.start + 1} / ${g.checkDigitIndex + 2}`, gridRow: 3 }}
            className={`flex flex-col items-center justify-center text-scale-1 ${
              g.valid ? 'cursor-default text-canvas-ink/50' : 'cursor-pointer text-hold'
            }`}
          >
            <span aria-hidden="true">{g.valid ? '✓' : '✗'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The signature element (§4). Machine-readable-zone lines rendered
 *  monospace, annotated with the check-digit arithmetic: an underline per
 *  group, a heavier-weight check-digit character, and — for a failing
 *  group — a --hold underline/background tint and a ✗ glyph with a
 *  tooltip. The tooltip prefers "expected X, read Y" (from the backend's
 *  MrzGroup, BACKEND_BRIEF.md §4); when those aren't present (e.g. some
 *  signal types won't carry them) it falls back to the linked signal's
 *  detail text via group.signalId — a direct lookup, no heuristic.
 *
 *  OCR-B is the typeface called for in the brief; we don't have a
 *  licensed copy yet, so this falls back to IBM Plex Mono (already the
 *  console's data face) until one is available. */
export function MrzRibbon({ mrz, signals, onGroupSelect }: MrzRibbonProps) {
  return (
    <div className="rounded border border-canvas-rule bg-canvas px-3 py-3">
      <div className="mb-2 text-eyebrow text-canvas-ink/70">Machine-readable zone</div>
      <div className="flex flex-col gap-2">
        {mrz.lines.map((line, i) => (
          <MrzLineRow key={i} line={line} signals={signals} onGroupSelect={onGroupSelect} />
        ))}
      </div>
    </div>
  );
}
