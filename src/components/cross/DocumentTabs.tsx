import type { ScreenedDocument } from '../../types/screening';

interface DocumentTabsProps {
  documents: ScreenedDocument[];
  active: string;
  onChange: (documentId: string) => void;
}

/** Each tab shows that document's own risk, independent of any
 *  session-level cross-document signal — a document can read clean here
 *  while CrossDocumentPanel still carries a finding (case-13). */
export function DocumentTabs({ documents, active, onChange }: DocumentTabsProps) {
  return (
    <div className="flex gap-1" role="tablist" aria-label="documents">
      {documents.map((document) => {
        const isActive = document.id === active;
        return (
          <button
            key={document.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(document.id)}
            className={`flex items-center gap-2 rounded border px-2 py-1 text-scale-2 ${
              isActive ? 'border-steel-200 bg-shell-700 text-steel-200' : 'border-shell-600 text-steel-400'
            }`}
          >
            <span>{document.type}</span>
            <span className="font-mono text-steel-400">
              {document.risk !== null ? `${document.risk}/100` : 'no risk'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
