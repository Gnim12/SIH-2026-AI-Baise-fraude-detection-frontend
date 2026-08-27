import { useEffect, useState, type ReactNode } from 'react';
import { RiskVerdict } from '../components/verdict/RiskVerdict';
import { StageProgress } from '../components/verdict/StageProgress';
import { ConfidenceMeter } from '../components/verdict/ConfidenceMeter';
import { FindingsList } from '../components/findings/FindingsList';
import { DocumentCanvas } from '../components/evidence/DocumentCanvas';
import { MrzRibbon } from '../components/evidence/MrzRibbon';
import type { FocusedRegion } from '../components/evidence/RegionOverlay';
import type { ViewKey } from '../components/evidence/ViewToggle';
import { ExtractedFields } from '../components/fields/ExtractedFields';
import { FacePair } from '../components/face/FacePair';
import { CrossDocumentPanel } from '../components/cross/CrossDocumentPanel';
import { IdentityGraphPanel } from '../components/graph/IdentityGraphPanel';
import { CoverageBanner } from '../components/system/CoverageBanner';
import { RecaptureTakeover } from '../components/system/RecaptureTakeover';
import type { ScreeningSession, Signal } from '../types/screening';

/** The two module -> view mappings the brief specifies explicitly (§5.2).
 *  Any other module leaves the currently active view untouched rather than
 *  guessing an unspecified mapping. */
const MODULE_VIEW: Partial<Record<Signal['module'], ViewKey>> = {
  tamper: 'heatmap',
  ocr: 'rgb',
};

interface ScreeningViewProps {
  session: ScreeningSession | null;
  /** Raw stage arrivals for StageProgress. Absent in read-only replay,
   *  where the session is already complete and StageProgress never shows. */
  stagesSeen?: ReadonlySet<string>;
  /** DecisionBar in LaneScreen, the sealed-record display in SessionDetail
   *  (§5.5). Rendered below CoverageBanner, in the position DecisionBar
   *  always occupied. */
  footer: ReactNode;
}

/** The shared evidence-panel tree behind both LaneScreen (live, editable)
 *  and SessionDetail (sealed, read-only replay) — §5.5: "reuse the
 *  LaneScreen component tree in a readOnly mode... same panels, but
 *  DecisionBar replaced by a sealed-record display." Everything here is
 *  already inert without a live WS connection or DecisionBar wired in, so
 *  "read-only" falls out of simply not passing those — no separate prop
 *  needed to disable interaction. */
export function ScreeningView({ session, stagesSeen, footer }: ScreeningViewProps) {
  const [activeView, setActiveView] = useState<ViewKey>('rgb');
  const [focusedRegion, setFocusedRegion] = useState<FocusedRegion | null>(null);
  const [highlightedSignalId, setHighlightedSignalId] = useState<string | null>(null);

  // A new session (case switch, or navigating to a different sealed
  // record) starts from a clean evidence-panel state.
  useEffect(() => {
    setActiveView('rgb');
    setFocusedRegion(null);
    setHighlightedSignalId(null);
  }, [session?.sessionId]);

  // §8: "Esc clears region focus on DocumentCanvas."
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFocusedRegion(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const document = session?.documents[0] ?? null;

  /** §5.1: quality.ok === false takes over immediately, before 'decision'
   *  even arrives to confirm band RECAPTURE — the officer needs the rescan
   *  instruction the moment capture is known to have failed, not after
   *  waiting for a verdict that will never carry a score. */
  const isRecapture = Boolean(session?.recaptureReason) || session?.band === 'RECAPTURE';

  /** Finding -> canvas direction. Rows without a region must not attempt
   *  to call the focus function (§5.2) — the "no location" marker is the
   *  whole affordance for those. */
  function focusSignal(signal: Signal) {
    if (!signal.region) return;
    setFocusedRegion({ signalId: signal.id, nonce: Date.now() });
    const view = MODULE_VIEW[signal.module];
    if (view) setActiveView(view);
  }

  /** MRZ ribbon -> findings direction (reverse of the above). */
  function handleGroupSelect(signal: Signal) {
    setHighlightedSignalId(signal.id);
  }

  return (
    <div className="flex h-full flex-col">
      {isRecapture ? (
        <RecaptureTakeover reason={session?.recaptureReason} hint={session?.recaptureHint} />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 min-[1100px]:flex-row">
          <div className="flex min-w-0 flex-col gap-4 min-[1100px]:flex-[62%]">
            {/* §8: reserve the verdict slot's final height (RiskVerdict +
                ConfidenceMeter) up front so StageProgress -> verdict on
                'decision' arrival doesn't shift the panels below it. */}
            <div className="flex min-h-[4.75rem] flex-col justify-center">
              {session?.band ? (
                <div className="flex flex-col gap-2">
                  <RiskVerdict band={session.band} risk={session.risk} />
                  <ConfidenceMeter confidence={session.confidence} />
                </div>
              ) : (
                <StageProgress stagesSeen={stagesSeen ?? new Set()} />
              )}
            </div>

            {document?.mrz ? (
              <MrzRibbon mrz={document.mrz} signals={session?.signals ?? []} onGroupSelect={handleGroupSelect} />
            ) : null}

            <DocumentCanvas
              document={document}
              signals={session?.signals ?? []}
              activeView={activeView}
              onActiveViewChange={setActiveView}
              focusedRegion={focusedRegion}
              onRegionFocus={focusSignal}
            />
          </div>

          <section className="flex min-w-0 flex-col gap-4 min-[1100px]:flex-[38%]">
            <div>
              <h2 className="text-eyebrow mb-2">Findings</h2>
              <FindingsList
                signals={session?.signals ?? []}
                onSelectSignal={focusSignal}
                highlightedSignalId={highlightedSignalId}
              />
            </div>

            <div>
              <h2 className="text-eyebrow mb-2">Extracted fields</h2>
              <ExtractedFields fields={document?.fields ?? []} />
            </div>

            <div>
              <h2 className="text-eyebrow mb-2">Face</h2>
              <FacePair face={session?.face ?? null} />
            </div>

            <div>
              <h2 className="text-eyebrow mb-2">Cross-document</h2>
              <CrossDocumentPanel
                documents={session?.documents ?? []}
                signals={session?.signals ?? []}
                crossDocumentSignals={session?.crossDocumentSignals ?? []}
                onSelectSignal={focusSignal}
              />
            </div>

            <div>
              <h2 className="text-eyebrow mb-2">Identity graph</h2>
              <IdentityGraphPanel graph={session?.graph ?? null} />
            </div>
          </section>
        </div>
      )}

      <CoverageBanner coverageFlags={session?.coverageFlags ?? []} />

      {footer}
    </div>
  );
}
