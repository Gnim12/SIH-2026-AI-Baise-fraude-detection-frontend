# Officer Console — Frontend Build Brief

**Project:** AI-Based Fake Identity & Document Screening System
**This document:** the complete brief for the React frontend. Build against it directly.
**Rename to `CLAUDE.md` at repo root** if you want it loaded automatically every session.

---

## 0. Read this first

You are building the **officer console**: the screen a border officer looks at while a
traveller stands in front of them. Not a marketing site, not an analytics dashboard.
An instrument.

Three consequences that override normal dashboard instincts:

1. **The officer decides, not the system.** No screening closes without a logged human
   action. There is no auto-clear.
2. **Every finding must be spatially verifiable.** If the system says "the date of birth
   was edited", the officer must be able to click that finding and see the exact region
   highlighted on the document. A finding without coordinates is not trustworthy.
3. **Speed of comprehension beats completeness.** The officer has seconds. Verdict first,
   evidence second, raw data third.

**The backend does not exist yet.** Build the entire frontend against a mock server that
replays recorded screening sessions. This is not a shortcut — the mock is a deliverable,
because it is also the demo harness and the test fixture set.

---

## 1. Stack

Fixed decisions. Do not substitute.

| Concern | Choice | Note |
|---|---|---|
| Build | **Vite** | not CRA, not Next — this is a single-page instrument, no SSR needed |
| Language | **TypeScript**, strict | the data contracts below are the point |
| UI | **React 18**, function components + hooks | |
| Styling | **Tailwind CSS** + CSS custom properties for tokens | tokens in `:root`, Tailwind reads them |
| State | **Zustand** | one session store; Redux is overkill, Context will re-render too much |
| Routing | **React Router** | 3 routes only |
| Transport | native **WebSocket** + `fetch` | no socket.io |
| Charts | **none** for v1 | resist adding them |
| Icons | **lucide-react** | |
| Tests | **Vitest** + **React Testing Library** | |
| Mock server | **Node + `ws`**, standalone script | runs with `npm run mock` |

```bash
npm run dev     # vite, port 5173
npm run mock    # mock ws + rest server, port 8787
npm run dev:all # both, concurrently
```

---

## 2. Repository layout

```
officer-console/
  src/
    types/
      screening.ts        # ALL contracts. Single source of truth.
    store/
      sessionStore.ts     # zustand: current session + event reducer
      settingsStore.ts    # lane id, officer id, watchlist staleness
    api/
      client.ts           # fetch wrappers
      socket.ts           # WS connect, reconnect, event dispatch
    screens/
      LaneScreen.tsx      # the main screening view
      HistoryScreen.tsx   # past sessions for this shift
      SessionDetail.tsx   # read-only replay of a sealed session
    components/
      verdict/            # RiskVerdict, DecisionBar, ConfidenceMeter
      evidence/           # DocumentCanvas, RegionOverlay, ViewToggle, MrzRibbon
      findings/           # FindingsList, FindingRow, SeverityChip
      fields/             # ExtractedFields, FieldRow, ConfidenceDot
      face/               # FacePair, SimilarityBar, PadBadge
      cross/              # CrossDocumentPanel, DocumentTabs
      graph/              # IdentityGraphPanel, EncounterRow
      system/             # StageProgress, CoverageBanner, StalenessBadge
      shell/              # AppShell, LaneHeader, ConnectionState
    lib/
      risk.ts             # band(), bandColor(), formatWeight()
      geometry.ts         # region -> canvas coords, scaling
      time.ts
  mock/
    server.mjs            # ws + rest
    fixtures/
      case-00-bad-capture.json
      ...                 # one per case, see §6
      assets/             # document images, face crops, heatmaps
  FRONTEND_BRIEF.md       # this file
```

---

## 3. Data contracts

**`src/types/screening.ts` is the single source of truth.** Write it first, before any
component. Every mock fixture must typecheck against it.

```ts
// ---------- primitives ----------
export type Decision   = 'CLEAR' | 'SECONDARY' | 'HOLD' | 'REFER';
export type SystemBand = 'CLEAR' | 'SECONDARY' | 'HOLD' | 'ABSTAIN' | 'RECAPTURE';
export type Severity   = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type DocType    = 'PASSPORT' | 'VISA' | 'NATIONAL_ID' | 'LICENCE' | 'PERMIT' | 'UNKNOWN';

/** Normalised 0..1 coordinates, relative to the rectified document image.
 *  Normalised so the overlay survives any canvas size. Never store pixels. */
export interface Region {
  x: number; y: number; w: number; h: number;
  documentId: string;
}

// ---------- findings ----------
export interface Signal {
  id: string;
  code: string;            // e.g. 'MRZ_CHECKDIGIT_DOB' — see appendix A of the spec
  module: 'ocr' | 'validation' | 'tamper' | 'face' | 'ovd' | 'template'
        | 'database' | 'graph' | 'crossdoc' | 'system';
  severity: Severity;
  weight: number;          // contribution to risk; 0 for info-only
  detail: string;          // human sentence, already written by the backend
  region?: Region;         // ABSENT for non-spatial signals (face, watchlist)
  heatmapUrl?: string;
  /** Set when >=3 modules agree on the same region. Render as a group. */
  convergenceGroup?: string;
}

// ---------- documents ----------
export interface ExtractedField {
  key: string;             // 'birth_date'
  label: string;           // 'Date of birth'
  value: string;
  confidence: number;      // 0..1
  source: 'MRZ' | 'VIZ' | 'MERGED';
  mismatch?: boolean;      // MRZ and VIZ disagree on this field
}

export interface MrzLine {
  text: string;            // exactly 30 / 36 / 44 chars
  /** Character-index ranges that form check-digit-protected groups. */
  groups: Array<{
    name: string;          // 'doc_number' | 'birth_date' | 'expiry_date' | 'composite'
    start: number;         // inclusive
    end: number;           // exclusive, EXCLUDES the check digit itself
    checkDigitIndex: number;
    valid: boolean;
  }>;
}

export interface ScreenedDocument {
  id: string;
  type: DocType;
  country?: string;        // ISO-3166 alpha-3
  version?: string;
  imageUrl: string;        // rectified document image
  views: Partial<Record<'rgb' | 'ela' | 'noise' | 'heatmap' | 'fft', string>>;
  mrz?: { format: 'TD1'|'TD2'|'TD3'|'MRV-A'|'MRV-B'; lines: MrzLine[]; status: 'VERIFIED'|'UNRECOVERABLE' };
  fields: ExtractedField[];
  risk: number | null;
}

// ---------- face ----------
export interface FaceResult {
  status: 'MATCH' | 'MISMATCH' | 'SPOOF' | 'UNAVAILABLE';
  similarity: number | null;   // null when SPOOF or UNAVAILABLE
  threshold: number;
  documentPortraitUrl?: string;
  livePortraitUrl?: string;
  padVerdict: 'live' | 'spoof' | 'not_run';
  ghostPortraitConsistent?: boolean;
}

// ---------- identity graph ----------
export interface Encounter {
  sessionId: string;
  timestamp: string;       // ISO
  checkpoint: string;
  nameOnDocument: string;
  documentNumber: string;
  faceSimilarity: number;
  conflict: boolean;       // same face, different identity
}

export interface GraphResult {
  priorEncounters: Encounter[];
  conflicts: number;
  impossibleTravel: boolean;
}

// ---------- the session ----------
export interface ScreeningSession {
  sessionId: string;
  laneId: string;
  officerId: string;
  startedAt: string;
  band: SystemBand | null;      // null while still processing
  risk: number | null;          // null when ABSTAIN or RECAPTURE
  confidence: number | null;
  abstained: boolean;
  recaptureReason?: string;
  recaptureHint?: string;
  documents: ScreenedDocument[];
  signals: Signal[];
  face: FaceResult | null;
  graph: GraphResult | null;
  crossDocumentSignals: Signal[];
  coverageFlags: string[];      // 'no_biometric' | 'stale_watchlist' | 'no_ovd' ...
  timingMs: Record<string, number>;
  officerDecision?: {
    decision: Decision;
    note: string;
    decidedAt: string;
    override: boolean;          // differed from the system band
  };
  sealed: boolean;
}
```

### WebSocket events

The server pushes results **as they land**, not in one blob. The UI must render
progressively. Event union:

```ts
export type ScreeningEvent =
  | { stage: 'received';   sessionId: string; laneId: string; officerId: string }
  | { stage: 'quality';    documentId: string; ok: boolean; dpi?: number;
      reason?: string; hint?: string }
  | { stage: 'classified'; documentId: string; type: DocType; country: string;
      version: string; confidence: number; imageUrl: string }
  | { stage: 'ocr';        documentId: string; fields: ExtractedField[];
      mrz?: ScreenedDocument['mrz']; signals: Signal[] }
  | { stage: 'face';       face: FaceResult; signals: Signal[] }
  | { stage: 'database';   graph: GraphResult; signals: Signal[] }
  | { stage: 'forensics';  documentId: string;
      views: ScreenedDocument['views']; signals: Signal[] }
  | { stage: 'crossdoc';   signals: Signal[] }
  | { stage: 'decision';   band: SystemBand; risk: number | null;
      confidence: number; abstained: boolean; coverageFlags: string[];
      timingMs: Record<string, number> }
  | { stage: 'error';      message: string };
```

**Reducer rules — get these right, they are the whole architecture:**

- Events are **additive**. Never replace the session; merge into it.
- `signals` arrays are **appended and deduplicated by `id`**.
- A stage that never arrives is **missing evidence**, not a pass. If `face` never
  arrives, `face` stays `null` and `coverageFlags` will contain `no_biometric`.
- `decision` is terminal for the system, **not** for the session. The session stays
  open until the officer acts.
- Out-of-order events are legal. Do not assume ordering.

---

## 4. Design direction

The client has already rejected generic dashboards. Follow this exactly.

### The thesis: instrument shell, document canvas

The chrome around the edges is a **dark instrument**: the machine, the lane, the state
of the system. The centre is a **light canvas**: the document itself, sitting on neutral
paper-grey, because the officer is inspecting a physical object. That contrast is
functional, not decorative — it tells you at a glance which pixels are *evidence* and
which are *interface*.

Do not make the whole UI dark. Do not make the whole UI light.

### Colour tokens

```css
:root {
  /* instrument shell */
  --shell-900: #0D151C;   /* outermost chrome */
  --shell-800: #14202A;   /* panels */
  --shell-700: #1D2C38;   /* raised rows, hover */
  --shell-600: #2A3D4C;   /* borders on dark */
  --steel-400: #7A8FA0;   /* secondary text on dark */
  --steel-200: #C3D0DA;   /* primary text on dark */

  /* document canvas */
  --canvas:    #EDEFF1;   /* the paper the document sits on */
  --canvas-ink:#111820;   /* text on canvas */
  --canvas-rule:#C9D0D7;

  /* verdict — semantic ONLY. Never use these decoratively. */
  --clear:     #2E9E6B;
  --secondary: #C98A1E;
  --hold:      #D14356;
  --abstain:   #6B77C4;   /* deliberately not grey: abstention is a real state */
  --recapture: #7A8FA0;
}
```

**Colour never carries meaning alone.** Every verdict state also has a label and a
distinct glyph (see below). Officers work under coloured terminal lighting and some are
colour-blind.

| Band | Glyph | Label |
|---|---|---|
| CLEAR | filled circle | `CLEAR` |
| SECONDARY | half-filled circle | `SECONDARY INSPECTION` |
| HOLD | filled square | `HOLD` |
| ABSTAIN | open circle with slash | `INSUFFICIENT EVIDENCE` |
| RECAPTURE | open circle | `RESCAN REQUIRED` |

### Typography

Three roles, three faces. All from Google Fonts except OCR-B.

- **Display — `Archivo`**, weight 700, `font-stretch: 112%`, tracking `+0.06em`,
  uppercase. Used only for the verdict word and section eyebrows. Wide grotesques are
  the language of airport signage; that is where this thing lives.
- **Body — `Public Sans`**, 400/600. It is the US design-system face: institutional,
  plain, no personality of its own. Correct for a legal-consequence interface.
- **Data — `IBM Plex Mono`**, 400/500. All field values, document numbers, dates,
  timings, signal codes. Anything an officer may need to compare character by character.

Type scale (rem): `0.6875 / 0.8125 / 0.9375 / 1.125 / 1.5 / 2.75`. The 2.75 is used
exactly once per screen — the verdict.

### The signature element: the MRZ ribbon

This is the one thing the console will be remembered by. Build it well.

Render the machine-readable zone in **OCR-B** (fall back to IBM Plex Mono), full width,
monospaced, at the top of the evidence panel — as the document actually prints it. Then
annotate it with the arithmetic:

```
┌──────────────────────────────────────────────────────────────────┐
│ P<INDDUPONT<<JEAN<<<<<<<<<<<<<<<<<<<<<<<<<<<                     │
│ L898902C36IND7408122F1204159ZE184226B<<<<<10                     │
│ └───────┘│         └────┘│      └────┘│                          │
│  doc no  ✓          dob  ✗      expiry ✓                         │
└──────────────────────────────────────────────────────────────────┘
```

- Each check-digit-protected group gets a thin underline in `--canvas-rule`.
- The check digit itself is rendered in a heavier weight.
- A **failing** group: underline becomes `--hold`, the group's characters get a
  `--hold` tinted background at 12% opacity, and a small `✗` sits beneath.
- Hovering a group shows a tooltip: `expected 4, read 7`.
- Clicking a group scrolls the findings list to the matching signal.

Nothing else in the interface gets this level of decoration. Spend the boldness here.

### Layout

```
┌─ LaneHeader ────────────────────────────────────────────────────────┐
│ IGI-T3-LANE-07   OFF-2291   ● connected   watchlist synced 4h ago ⚠ │
├──────────────────────────────────┬──────────────────────────────────┤
│ VERDICT (Archivo, 2.75rem)       │  FINDINGS                        │
│ ■ HOLD              78 / 100     │  ▸ MRZ check digit (DOB)   +30   │
│ confidence ▓▓▓▓▓▓▓▓░░ 0.91       │  ▸ Font mismatch in DOB    +22   │
│ ─────────────────────────────    │  ▸ Face match 0.31         +18   │
│ [ document tabs: Passport | Visa]│  ▸ Watchlist clear           0   │
│                                  │                                  │
│  ┌─ MRZ ribbon ────────────────┐ │  EXTRACTED FIELDS                │
│  │ (signature element)         │ │  Surname   DUPONT       0.98     │
│  └─────────────────────────────┘ │  Given     JEAN         0.97     │
│                                  │  DOB       1990-04-12   0.62 ⚠   │
│  ┌─ DocumentCanvas ───────────┐  │  Expiry    2029-08-01   0.97     │
│  │  document image with       │  │                                  │
│  │  clickable region boxes    │  │  FACE                            │
│  │  + heatmap overlay         │  │  [doc] ↔ [live]   0.31 / 0.38    │
│  └────────────────────────────┘  │  PAD: live                       │
│  [ RGB | ELA | Noise | Heat |FFT]│                                  │
│                                  │  CROSS-DOCUMENT   1 conflict ⚠   │
│                                  │  IDENTITY GRAPH   2 prior, 1 ⚠   │
├──────────────────────────────────┴──────────────────────────────────┤
│ CoverageBanner: screened without biometric verification             │
├─────────────────────────────────────────────────────────────────────┤
│ DecisionBar   [ Clear ] [ Secondary ] [ Hold ] [ Refer ]  note: ___ │
└─────────────────────────────────────────────────────────────────────┘
```

Left column ~62%, right ~38%. Below 1100px the right column moves under the canvas.
The decision bar is **always** pinned to the bottom and never scrolls away.

### Motion

Restraint. Three moments only:

1. **Stage arrival** — each panel fades in over 140ms as its event lands. Nothing
   slides; sliding implies spatial meaning that isn't there.
2. **Verdict settle** — when `decision` arrives, the risk number counts up over 400ms
   and the glyph scales 0.9 → 1. Once. Never repeat on re-render.
3. **Region focus** — clicking a finding draws its box with a 200ms outline pulse.

Respect `prefers-reduced-motion: reduce`: disable 2 and 3, keep 1 as an instant swap.

---

## 5. Screens and behaviour

### 5.1 `LaneScreen` — the main view

The only screen that matters. Everything above describes it.

**Progressive rendering.** Panels appear as their events arrive, in this order:
skeleton → quality → classified (image appears) → ocr (fields + MRZ ribbon) →
face → database → forensics (heatmap + regions) → decision (verdict resolves).

Before `decision` arrives, the verdict slot shows a `StageProgress` component: a
horizontal row of stage pips that fill as events land. Do **not** show a spinner and
do **not** show a provisional risk number.

**RECAPTURE is a full takeover.** If `quality.ok === false`, the entire left column is
replaced by the rescan instruction — the specific defect and the hint, in Archivo at
1.5rem. No risk number, no findings, no fields. The officer needs one instruction, not
a partial analysis.

**ABSTAIN suppresses the number.** `risk` is `null`. Render the band label
`INSUFFICIENT EVIDENCE` and the reason. Do not render `—/100` or `0/100`; render no
numeral at all.

### 5.2 Findings list

- Sorted by weight descending; `info` severity always last regardless of weight.
- Signals sharing a `convergenceGroup` render as **one grouped row** with the member
  signals nested beneath and a badge: `4 modules agree on this region`. This is the
  single most important thing on the screen when it appears — it is what separates a
  real finding from a scattered false positive. Give the group a `--hold` left rule.
- Clicking any row with a `region` focuses that region on the canvas and switches the
  view toggle to the view that produced it (`tamper` → heatmap, `ocr` → rgb).
- Rows without a region are still clickable but show a small "no location" marker
  instead of a focus affordance. Do not hide them and do not fake a location.

### 5.3 DocumentCanvas

- Renders `imageUrl` at natural aspect, scaled to fit.
- `Region` coordinates are normalised 0..1 — multiply by rendered size in
  `lib/geometry.ts`. Never bake pixel coordinates into fixtures.
- Heatmap overlays as a separate `<img>` at `mix-blend-mode: multiply`, opacity
  controlled by a slider (0–100%, default 70%).
- View toggle switches `views[key]`. If a view is absent, the button is disabled with
  a tooltip saying why — never hidden, because absence is information.
- Zoom: scroll to zoom, drag to pan, double-click to fit. Officers will want to look
  closely at a portrait seam.

### 5.4 DecisionBar

- Four buttons. The system's recommended band is visually pre-emphasised (a ring, not
  a pre-selection — nothing is selected until the officer clicks).
- **Note field is required** when the chosen decision differs from the system band, and
  when the decision is `HOLD` or `REFER`. Disable submit and say why:
  `A note is required when overriding the recommendation.`
- On submit: `POST /api/v1/screening/{id}/decision`, optimistic update, seal the
  session, navigate to a clean lane ready for the next traveller.
- Keyboard: `1` `2` `3` `4` select, `Enter` submits. Officers work fast.

### 5.5 `HistoryScreen` and `SessionDetail`

History: table of this shift's sealed sessions — time, document, system band, officer
decision, override flag. Filter by override only. This is where a supervisor looks.

SessionDetail: the LaneScreen in read-only replay mode, with the decision bar replaced
by the sealed record (decision, note, officer, timestamp, model versions). Reuse the
same components — pass `readOnly`.

### 5.6 System-state components

- `ConnectionState` — WS connected / reconnecting / offline. On offline, the lane header
  turns `--secondary` and reads `offline — screening continues against cached watchlist`.
- `StalenessBadge` — `watchlist synced 4h ago`. Above 12h it goes `--secondary`, above
  24h `--hold`. A clear result computed against a stale watchlist is a qualified result
  and must say so.
- `CoverageBanner` — renders whenever `coverageFlags` is non-empty, directly above the
  decision bar. Copy is plain: `Screened without biometric verification — face module
  did not complete.` Never phrase a coverage gap as reassurance.

---

## 6. Mock server and fixtures

`mock/server.mjs` serves REST + WS on 8787.

```
GET  /api/v1/cases                    -> list of fixture ids
POST /api/v1/screening                -> { sessionId }, body: { caseId }
WS   /ws/screening/:sessionId         -> replays that case's event tape
POST /api/v1/screening/:id/decision   -> 200, echoes sealed session
GET  /api/v1/history                  -> sealed sessions
```

Each fixture is an **event tape** — an array of `{ delayMs, event }` — so the mock
reproduces real progressive timing:

```json
{
  "id": "case-03-modified-dob",
  "title": "Modified date of birth",
  "tape": [
    { "delayMs":   0, "event": { "stage": "received", "sessionId": "…" } },
    { "delayMs": 180, "event": { "stage": "quality", "ok": true, "dpi": 312 } },
    { "delayMs": 310, "event": { "stage": "classified", "type": "PASSPORT", "country": "IND" } },
    { "delayMs": 720, "event": { "stage": "ocr", "…": "…" } },
    { "delayMs": 950, "event": { "stage": "face", "…": "…" } },
    { "delayMs":1140, "event": { "stage": "database", "…": "…" } },
    { "delayMs":1550, "event": { "stage": "forensics", "…": "…" } },
    { "delayMs":1620, "event": { "stage": "decision", "band": "HOLD", "risk": 87 } }
  ]
}
```

### Required fixtures — build all fifteen

Each exercises a distinct UI path. A screen that handles only case 1 and case 3 is not
finished.

| id | Case | What the UI must prove |
|---|---|---|
| 00 | Bad capture | RECAPTURE takeover, no score anywhere |
| 01 | Genuine, genuine | Clean CLEAR, empty findings state reads well |
| 02 | Expired document | SECONDARY from a rule, distinct from fraud |
| 03 | Modified DOB | **Convergence group** — 4 modules, 1 region. The showcase. |
| 04 | Photo replacement | Face passes but document fails — verdict must not be confused |
| 05 | Stamp forgery | Copy-move: two regions, same signal |
| 06 | Impersonation | Document clean, face 0.24 — FacePair is the evidence |
| 07 | Multiple identities | Identity graph panel with a conflicting prior encounter |
| 08 | Presentation attack | `similarity: null`, PAD badge is the whole story |
| 09 | Watchlist hit | Risk 100 arrives early, other stages still stream in after |
| 10 | Low confidence | ABSTAIN — no numeral rendered |
| 11 | Novel forgery | Single template-anomaly signal, no known-attack signals |
| 12 | Visa rule violation | Two documents, signal on the visa tab |
| 13 | Visa transplant | **Both documents green individually**, cross-doc panel red |
| 14 | Module failure | `face: null`, coverage banner, confidence reduced |

Case 13 is the one to demo second, after case 3. Make sure the document tabs both show
clean states while the cross-document panel carries the finding — that contrast is the
point.

Fixture assets: generate placeholder document images programmatically (a rectangle with
an MRZ strip rendered in mono, a portrait box, some field text). Do not use real
passport images, ever, including for mocks.

---

## 7. Non-negotiable behaviour

These come from the system specification. Violating one is a bug even if it looks fine.

1. **No auto-clear.** The UI never closes a session without an officer click.
2. **No score on RECAPTURE.** Not `0`, not `—`, not a greyed number. Nothing.
3. **No score on ABSTAIN.** Same.
4. **A missing module is never a pass.** `face: null` renders as a coverage gap, never
   as "no issues found".
5. **Every spatial signal is clickable to its region.** If a signal has a `region` and
   clicking does nothing, that is a bug.
6. **Colour never alone.** Every state has glyph + label.
7. **Override requires a note.** Enforced in the UI, not just the API.
8. **Stale watchlist is always visible**, not buried in settings.
9. **Never invent a coordinate.** If the backend gave no region, show none.
10. **Timing is shown, not hidden** — `1.62 s` in the header. Officers build trust in a
    system whose speed they can see.

---

## 8. Quality floor

- Responsive to 900px (tablet at the booth). Below that, single column, decision bar
  still pinned.
- Keyboard: full tab order, visible focus rings on `--steel-200`, `1–4` + `Enter` on
  the decision bar, `Esc` clears region focus.
- `prefers-reduced-motion` respected.
- Contrast: all text ≥ 4.5:1 against its surface. Check the `--steel-400` on
  `--shell-800` pairing specifically; darken the text if it fails.
- No layout shift when panels arrive — reserve height with skeletons matching final size.
- `aria-live="polite"` on the verdict slot so screen readers announce the band once.

---

## 9. Build order

Ship in this order. Each milestone is demoable on its own.

**M1 — contracts and shell.** `types/screening.ts`, zustand store with the event
reducer, mock server replaying case 1 and case 3, `AppShell` + `LaneHeader`. Prove
events merge correctly with a Vitest test on the reducer. *No styling yet.*

**M2 — verdict and findings.** `RiskVerdict`, `StageProgress`, `FindingsList` with
convergence grouping, `DecisionBar` with note enforcement. Design tokens applied.

**M3 — the evidence panel.** `DocumentCanvas` with region overlay and view toggle, then
the **MRZ ribbon**. Budget real time for the ribbon; it is the signature element.

**M4 — remaining panels.** `ExtractedFields`, `FacePair`, `CrossDocumentPanel`,
`IdentityGraphPanel`, `CoverageBanner`, `StalenessBadge`.

**M5 — all fifteen fixtures.** Walk every case. Fix every path that renders wrong.
This milestone always finds more bugs than expected.

**M6 — history, session detail, polish.** Read-only replay, keyboard shortcuts,
reduced-motion, contrast audit, responsive pass.

### Acceptance per milestone

- M1: reducer test passes for out-of-order and duplicate events.
- M2: case 10 renders ABSTAIN with no numeral; override without a note is blocked.
- M3: clicking finding 2 of case 3 focuses the DOB region and switches to heatmap.
- M4: case 14 shows the coverage banner and no face panel.
- M5: all 15 fixtures render without console errors or layout shift.
- M6: keyboard-only completion of a full screening, start to sealed.

---

## 10. Do not

- Do not add a chart library, a KPI row, or a "total screenings today" counter. This is
  an instrument, not an analytics dashboard.
- Do not use a component library (MUI, Chakra, shadcn). The verdict, ribbon, and canvas
  are all custom; the rest is too simple to justify the weight.
- Do not animate the risk number on every re-render — once, on arrival.
- Do not use the verdict colours decoratively anywhere. They mean one thing.
- Do not build a login screen. Lane and officer come from `settingsStore`, seeded from
  a query param in dev.
- Do not implement dark/light theme switching. The shell/canvas split is the design.
- Do not use real or scraped identity documents in fixtures.

---

## 11. Ask before you build

If any of these are ambiguous when you reach them, stop and ask rather than guessing:

- Whether a green-lane auto-clear policy is ever enabled (it changes rule 1).
- Whether the officer can re-run a screening from the console or only request a rescan.
- Whether supervisors need a separate role in v1 (affects HistoryScreen).

Everything else in this brief is decided. Build it.
