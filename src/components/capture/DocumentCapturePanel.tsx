import { useRef, useState, type DragEvent } from 'react';
import { formatBytes } from '../../lib/camera';
import type { DocType } from '../../types/screening';

/** Backend brief §7 / Stage 5.5: a session can carry more than one
 *  document (e.g. passport + visa). Subset of the full DocType union —
 *  LICENCE and UNKNOWN aren't capture-time choices an officer makes. */
export const CAPTURE_DOC_TYPES: DocType[] = ['PASSPORT', 'VISA', 'NATIONAL_ID', 'PERMIT'];

const ACCEPTED_MIME = ['image/jpeg', 'image/png'];

export interface CapturedDocument {
  docType: DocType;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

interface DocumentCapturePanelProps {
  documents: CapturedDocument[];
  onChange: (documents: CapturedDocument[]) => void;
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (width: number, height: number) => {
      if (settled) return;
      settled = true;
      resolve({ width, height });
    };
    const img = new Image();
    img.onload = () => finish(img.naturalWidth, img.naturalHeight);
    img.onerror = () => finish(0, 0);
    img.src = url;
    // jsdom has no image-decode support without the `canvas` npm package,
    // so neither onload nor onerror ever fires there — this bound keeps
    // capture usable (with 0x0 as the honest "unknown" placeholder) in that
    // environment instead of hanging forever; real browsers resolve via
    // onload well before this fires.
    setTimeout(() => finish(0, 0), 300);
  });
}

export function DocumentCapturePanel({ documents, onChange }: DocumentCapturePanelProps) {
  const [activeDocType, setActiveDocType] = useState<DocType>(CAPTURE_DOC_TYPES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeDoc = documents.find((d) => d.docType === activeDocType) ?? null;

  async function addFile(file: File) {
    setRejection(null);
    if (!ACCEPTED_MIME.includes(file.type)) {
      setRejection(`Rejected — ${file.type || 'unknown format'}. Accepted: JPG, PNG.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await readImageDimensions(previewUrl);
    const next = documents.filter((d) => d.docType !== activeDocType);
    next.push({ docType: activeDocType, file, previewUrl, width, height });
    onChange(next);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) addFile(file);
  }

  function handleRemove() {
    if (activeDoc) URL.revokeObjectURL(activeDoc.previewUrl);
    onChange(documents.filter((d) => d.docType !== activeDocType));
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Document capture</h2>

      <div className="flex gap-1" role="tablist" aria-label="document type">
        {CAPTURE_DOC_TYPES.map((type) => {
          const has = documents.some((d) => d.docType === type);
          const isActive = type === activeDocType;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDocType(type)}
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-scale-2 ${
                isActive ? 'border-steel-200 bg-shell-700 text-steel-200' : 'border-shell-600 text-steel-400'
              }`}
            >
              <span>{type}</span>
              {has && (
                <span aria-hidden="true" className="text-clear">
                  ●
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeDoc ? (
        <div className="flex flex-col gap-2">
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded border border-canvas-rule bg-canvas">
            <img
              src={activeDoc.previewUrl}
              alt={`${activeDoc.docType} capture preview`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-scale-1 text-steel-400">
            <dt>file</dt>
            <dd className="truncate text-steel-200">{activeDoc.file.name}</dd>
            <dt>dimensions</dt>
            <dd className="text-steel-200">
              {activeDoc.width} × {activeDoc.height}px
            </dd>
            <dt>size</dt>
            <dd className="text-steel-200">{formatBytes(activeDoc.file.size)}</dd>
            <dt>format</dt>
            <dd className="text-steel-200">{activeDoc.file.type || 'unknown'}</dd>
          </dl>
          <button
            type="button"
            onClick={handleRemove}
            className="w-fit rounded border border-shell-600 px-2 py-1 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Add ${activeDocType} image`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex h-[220px] cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed text-center text-scale-2 ${
            dragOver ? 'border-steel-200 bg-shell-700 text-steel-200' : 'border-shell-600 text-steel-400'
          }`}
        >
          <span>Drop {activeDocType} image, or click to browse</span>
          <span className="text-scale-1">JPG or PNG</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addFile(file);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {rejection && (
        <p role="alert" className="text-scale-2 text-hold">
          {rejection}
        </p>
      )}

      <p className="font-mono text-scale-1 text-steel-400">
        {documents.length} document{documents.length === 1 ? '' : 's'} added
      </p>
    </div>
  );
}
