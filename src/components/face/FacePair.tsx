import type { FaceResult } from '../../types/screening';
import { SimilarityBar } from './SimilarityBar';
import { PadBadge } from './PadBadge';

const STATUS_LABEL: Record<FaceResult['status'], string> = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  SPOOF: 'SPOOF DETECTED',
  UNAVAILABLE: 'UNAVAILABLE',
};

const STATUS_COLOR_CLASS: Record<FaceResult['status'], string> = {
  MATCH: 'text-clear',
  MISMATCH: 'text-hold',
  SPOOF: 'text-hold',
  UNAVAILABLE: 'text-steel-400',
};

interface PortraitProps {
  label: string;
  url?: string;
}

/** Absence of a portrait is information, never hidden — same rule as
 *  ViewToggle's disabled-with-tooltip treatment of a missing view. */
function Portrait({ label, url }: PortraitProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded border border-shell-600 bg-shell-700">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          // text-steel-300, not -400: this box's background is always
          // --shell-700, where --steel-400 fails contrast (4.26:1).
          <span className="px-1 text-center text-scale-1 text-steel-300">no image</span>
        )}
      </div>
      <span className="text-scale-1 text-steel-400">{label}</span>
    </div>
  );
}

interface FacePairProps {
  face: FaceResult | null;
}

export function FacePair({ face }: FacePairProps) {
  if (!face) {
    return <p className="px-2 py-1.5 text-scale-3 text-steel-400">No face data.</p>;
  }

  return (
    <div className="flex flex-col gap-3 px-2 py-1.5">
      <div className="flex items-center gap-4">
        <Portrait label="document" url={face.documentPortraitUrl} />
        <span aria-hidden="true" className="text-steel-400">
          ↔
        </span>
        <Portrait label="live" url={face.livePortraitUrl} />
      </div>

      {/* similarity is null on SPOOF/UNAVAILABLE — show the status instead of
          a bar/numeral that would imply a comparison was actually made. */}
      {face.similarity !== null ? (
        <SimilarityBar similarity={face.similarity} threshold={face.threshold} />
      ) : (
        <span className={`text-scale-2 ${STATUS_COLOR_CLASS[face.status]}`}>{STATUS_LABEL[face.status]}</span>
      )}

      <PadBadge padVerdict={face.padVerdict} />

      {face.captureMethod === 'upload' && (
        <p className="text-scale-1 text-hold">face photo uploaded (dev/test — not a live capture)</p>
      )}
    </div>
  );
}
