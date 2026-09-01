import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './lib/contrast';

/** Parses `--token: #hex;` declarations out of one CSS rule block's body.
 *  Deliberately not a full CSS parser — index.css's tokens are all flat
 *  hex custom properties, so a line-oriented regex is enough and keeps
 *  this test readable as a direct check against the real file, not a
 *  hand-copied duplicate of it (which would drift silently). */
function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const re = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    tokens[m[1]] = m[2].toLowerCase();
  }
  return tokens;
}

function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector ${selector} not found`);
  const braceStart = css.indexOf('{', start);
  const braceEnd = css.indexOf('\n}', braceStart);
  return css.slice(braceStart, braceEnd);
}

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8');
const rootTokens = parseTokens(extractBlock(css, ':root'));
const lightTokens = parseTokens(extractBlock(css, "[data-theme='light']"));

describe('theme-audit: canvas tokens are theme-invariant', () => {
  it('the light-theme block never redefines --canvas, --canvas-ink, or --canvas-rule', () => {
    // The document canvas represents physical paper, not system chrome --
    // it must render identically regardless of shell theme. Proving that
    // means the light override block must not even mention these tokens
    // (letting them fall through to :root is what makes them invariant).
    expect(lightTokens.canvas).toBeUndefined();
    expect(lightTokens['canvas-ink']).toBeUndefined();
    expect(lightTokens['canvas-rule']).toBeUndefined();
  });

  it(':root defines canvas tokens (sanity — the block above proves absence, not the values themselves)', () => {
    expect(rootTokens.canvas).toBeDefined();
    expect(rootTokens['canvas-ink']).toBeDefined();
    expect(rootTokens['canvas-rule']).toBeDefined();
  });
});

describe('theme-audit: WCAG contrast, ≥4.5:1 for body text, both themes', () => {
  // Every text-colour-on-background pairing actually used in the app
  // (grepped from src/components and src/screens), not just tokens
  // compared in isolation. shell-900 and shell-800 are the two
  // backgrounds body/label text is ever placed on directly; shell-700 is
  // additionally checked for steel-300 and steel-200, which the app does
  // place there (SeverityChip, FacePair's "no image" box, FindingRow's
  // group-hover state, ViewToggle's active/hover state).
  const themes: Array<{ name: string; tokens: Record<string, string> }> = [
    { name: 'dark', tokens: rootTokens },
    // Light theme values fall back to :root for anything it doesn't
    // redefine (real CSS cascade behaviour) -- mirror that here.
    { name: 'light', tokens: { ...rootTokens, ...lightTokens } },
  ];

  const pairs: Array<[fg: string, bg: string, label: string]> = [
    ['steel-200', 'shell-900', 'primary text on outermost chrome'],
    ['steel-200', 'shell-800', 'primary text on panels'],
    ['steel-200', 'shell-700', 'primary text on raised/hover rows'],
    ['steel-200', 'shell-600', 'primary text on selected decision-bar button'],
    ['steel-400', 'shell-900', 'secondary text on outermost chrome'],
    ['steel-400', 'shell-800', 'secondary text on panels'],
    ['steel-300', 'shell-900', 'RAKSHAK brand mark eyebrow on the login left panel and LaneHeader'],
    ['steel-300', 'shell-700', 'secondary text on raised/hover rows (SeverityChip, FacePair, FindingRow hover)'],
    ['steel-300', 'shell-800', 'secondary text on panels, hover state'],
    ['clear', 'shell-900', 'CLEAR verdict / capture-panel check icon on chrome'],
    ['clear', 'shell-800', 'CLEAR verdict / capture-panel check icon on panels'],
    ['secondary', 'shell-900', 'SECONDARY verdict / low-confidence marker on chrome'],
    ['secondary', 'shell-800', 'SECONDARY verdict / low-confidence marker on panels'],
    ['hold', 'shell-900', 'HOLD verdict / error text on chrome'],
    ['hold', 'shell-800', 'HOLD verdict / error text on panels'],
    ['abstain', 'shell-900', 'ABSTAIN verdict on chrome'],
    ['abstain', 'shell-800', 'ABSTAIN verdict on panels'],
    ['recapture', 'shell-900', 'RECAPTURE verdict / takeover instruction on chrome'],
    ['recapture', 'shell-800', 'RECAPTURE verdict on panels'],
    // Badge/chip text on their SOLID pre-mixed backgrounds (not a live
    // bg-hold/20-style alpha blend — see index.css). One entry per
    // component that carries this pattern, so a regression in any of
    // them is traceable to a named component, not just a bare token pair.
    ['hold', 'hold-badge-bg', 'HistoryScreen override chip'],
    ['hold', 'hold-badge-bg', 'CrossDocumentPanel finding-count chip'],
    ['hold', 'hold-badge-bg', 'SealedRecord override chip'],
    ['hold', 'hold-badge-bg', 'EncounterRow conflict chip'],
    ['hold', 'hold-badge-bg', 'IdentityGraphPanel impossible-travel chip'],
    ['hold', 'hold-badge-bg', 'FindingsList convergence-group chip'],
    ['hold', 'hold-badge-bg', 'FieldRow MRZ/VIZ mismatch chip'],
    ['secondary', 'secondary-badge-bg', 'CoverageBanner'],
    // SealedRecord's decision-label pill uses steel-200, not --hold,
    // as its text, but sits on the same --hold-badge-bg when overridden.
    ['steel-200', 'hold-badge-bg', 'SealedRecord decision-label pill (override state)'],
  ];

  for (const { name, tokens } of themes) {
    describe(`${name} theme`, () => {
      for (const [fgKey, bgKey, label] of pairs) {
        it(`${fgKey} on ${bgKey} (${label}) is >= 4.5:1`, () => {
          const fg = tokens[fgKey];
          const bg = tokens[bgKey];
          expect(fg, `--${fgKey} missing from ${name} theme tokens`).toBeDefined();
          expect(bg, `--${bgKey} missing from ${name} theme tokens`).toBeDefined();
          const ratio = contrastRatio(fg, bg);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});
