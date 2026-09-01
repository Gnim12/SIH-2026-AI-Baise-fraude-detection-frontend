import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitCapture } from '../../api/capture';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DocumentCapturePanel, type CapturedDocument } from './DocumentCapturePanel';
import { LiveFaceCapture, type LiveFrame } from './LiveFaceCapture';
import { VideoSweepPanel } from './VideoSweepPanel';
import { DevFixturePicker } from './DevFixturePicker';

/** The capture step BEFORE a screening session exists: the officer
 *  provides the document image(s), a live face frame, and an optional
 *  video sweep, then starts the session. No quality/DPI verdict is shown
 *  here — that belongs to the backend's real Gate 1, delivered after
 *  submission via the existing 'quality' WS event and RECAPTURE takeover
 *  in LaneScreen; inventing one here would be exactly the kind of
 *  fabricated confidence this project avoids elsewhere. */
export function CaptureScreen() {
  const laneId = useSettingsStore((s) => s.laneId);
  // CaptureScreen only mounts behind RequireAuth (AppShell), so officer is
  // never null here in practice -- fall back to an empty string rather
  // than assert, since a type-level guarantee across that route boundary
  // isn't worth the complexity for one field.
  const officerId = useAuthStore((s) => s.officer?.officerId ?? '');
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<CapturedDocument[]>([]);
  const [liveFrame, setLiveFrame] = useState<LiveFrame | null>(null);
  const [videoSweep, setVideoSweep] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canStart = documents.length > 0 && liveFrame !== null && !submitting;

  async function handleStart() {
    if (!liveFrame) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { sessionId } = await submitCapture({
        documents: documents.map((d) => ({ docType: d.docType, file: d.file })),
        liveFrame: liveFrame.blob,
        liveFrameCaptureMethod: liveFrame.method,
        videoSweep: videoSweep ?? undefined,
        checkpointId: laneId,
        officerId,
      });
      navigate(`/lane/${sessionId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not start screening.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-shell-700 px-4 py-2">
        <DevFixturePicker />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[3fr_2fr]">
        <DocumentCapturePanel documents={documents} onChange={setDocuments} />

        <div className="flex flex-col gap-4">
          <LiveFaceCapture onFrameChange={setLiveFrame} />
          <VideoSweepPanel onSweepChange={setVideoSweep} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-shell-600 bg-shell-800 px-4 py-3">
        <span className="font-mono text-scale-2 text-steel-400">
          checkpoint <span className="text-steel-200">{laneId}</span>
        </span>
        <span className="font-mono text-scale-2 text-steel-400">
          officer <span className="text-steel-200">{officerId}</span>
        </span>

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={!canStart}
          className="ml-auto rounded bg-steel-200 px-4 py-1.5 text-scale-3 text-shell-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Starting…' : 'Start screening'}
        </button>
      </div>

      {submitError && (
        <p role="alert" className="border-t border-shell-700 px-4 py-2 text-scale-2 text-hold">
          {submitError}
        </p>
      )}
    </div>
  );
}
