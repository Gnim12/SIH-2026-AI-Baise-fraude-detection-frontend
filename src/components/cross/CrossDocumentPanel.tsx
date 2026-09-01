import { useState } from 'react';
import type { ScreenedDocument, Signal } from '../../types/screening';
import { DocumentTabs } from './DocumentTabs';
import { FindingsList } from '../findings/FindingsList';

interface CrossDocumentPanelProps {
  documents: ScreenedDocument[];
  /** Session-wide per-document signals (region.documentId ties a signal to
   *  a tab). Filtered per active tab — this is deliberately NOT the same
   *  list as crossDocumentSignals below. */
  signals: Signal[];
  /** Session-level cross-document findings. Rendered in their own section,
   *  never merged into a per-document findings list, because a signal here
   *  can exist even when every individual document tab is clean (case-13
   *  — visa transplant — is the whole point of keeping these separate). */
  crossDocumentSignals: Signal[];
  onSelectSignal?: (signal: Signal) => void;
}

export function CrossDocumentPanel({
  documents,
  signals,
  crossDocumentSignals,
  onSelectSignal,
}: CrossDocumentPanelProps) {
  const [active, setActive] = useState(documents[0]?.id ?? '');

  if (documents.length === 0) {
    return <p className="px-2 py-1.5 text-scale-3 text-steel-400">No documents.</p>;
  }

  const activeDocumentSignals = signals.filter((s) => s.region?.documentId === active);

  return (
    <div className="flex flex-col gap-3">
      <DocumentTabs documents={documents} active={active} onChange={setActive} />

      <div role="tabpanel">
        <FindingsList signals={activeDocumentSignals} onSelectSignal={onSelectSignal} />
      </div>

      <div className="border-t border-shell-700 pt-2">
        <h3 className="text-eyebrow mb-2 flex items-center gap-2">
          Cross-document
          {crossDocumentSignals.length > 0 && (
            <span className="rounded bg-hold-badge px-1.5 py-0.5 text-scale-1 text-hold">
              {crossDocumentSignals.length} finding{crossDocumentSignals.length === 1 ? '' : 's'}
            </span>
          )}
        </h3>
        {crossDocumentSignals.length === 0 ? (
          <p className="px-2 py-1.5 text-scale-3 text-steel-400">No cross-document findings.</p>
        ) : (
          <FindingsList signals={crossDocumentSignals} onSelectSignal={onSelectSignal} />
        )}
      </div>
    </div>
  );
}
