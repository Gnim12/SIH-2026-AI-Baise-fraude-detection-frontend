import { useEffect, useRef, useState } from 'react';
import { captureVideoFrame, describeCameraError } from '../../lib/camera';

type Phase = 'idle' | 'starting' | 'live' | 'captured' | 'error';
type CaptureMethod = 'live' | 'upload';

export interface LiveFrame {
  blob: Blob;
  url: string;
  method: CaptureMethod;
}

interface LiveFaceCaptureProps {
  onFrameChange: (frame: LiveFrame | null) => void;
}

function cameraApiAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** Real getUserMedia webcam integration (§ Live face capture), with a
 *  dev/test file-upload fallback for environments without a webcam. ACTIVATE
 *  CAMERA starts the stream and shows a live preview; CAPTURE snapshots a
 *  still frame via an offscreen canvas and replaces the live preview with
 *  it, showing RETAKE. Permission denial and no-camera-available are both
 *  handled explicitly with a technical error line, never a crash.
 *
 *  The upload fallback is offered automatically when getUserMedia is
 *  unavailable or fails, and is also always reachable via a small manual
 *  link even when the camera works, for testing. An uploaded photo is never
 *  presented or reported as a live capture — see LiveFrame['method'] and
 *  FaceResult.capture_method (app/contracts/session.py) on the backend. */
export function LiveFaceCapture({ onFrameChange }: LiveFaceCaptureProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<CaptureMethod | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!cameraApiAvailable()) {
      setPhase('error');
      setError('No camera API available in this browser — upload a photo instead.');
    }
    return () => {
      stopStream();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate() {
    if (!cameraApiAvailable()) {
      setPhase('error');
      setError('No camera API available in this browser — upload a photo instead.');
      return;
    }
    setPhase('starting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase('live');
    } catch (err) {
      setPhase('error');
      setError(`${describeCameraError(err)} Upload a photo instead.`);
    }
  }

  async function capture() {
    if (!videoRef.current) return;
    const blob = await captureVideoFrame(videoRef.current);
    stopStream();
    const url = URL.createObjectURL(blob);
    setCapturedUrl(url);
    setMethod('live');
    setPhase('captured');
    onFrameChange({ blob, url, method: 'live' });
  }

  function pickUpload() {
    fileInputRef.current?.click();
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    const url = URL.createObjectURL(file);
    setCapturedUrl(url);
    setMethod('upload');
    setError('');
    setPhase('captured');
    onFrameChange({ blob: file, url, method: 'upload' });
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setMethod(null);
    onFrameChange(null);
    if (cameraApiAvailable()) {
      void activate();
    } else {
      setPhase('error');
      setError('No camera API available in this browser — upload a photo instead.');
    }
  }

  const showManualUploadLink = phase === 'idle' || phase === 'live' || phase === 'starting';

  return (
    <div className="flex flex-col gap-3 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Live face capture</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        aria-label="Upload face photo"
      />

      <div className="flex h-[220px] items-center justify-center overflow-hidden rounded border border-canvas-rule bg-canvas">
        {phase === 'captured' && capturedUrl ? (
          <img
            src={capturedUrl}
            alt={method === 'upload' ? 'Uploaded face photo' : 'Captured live frame'}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-full w-full object-cover ${phase === 'live' ? '' : 'hidden'}`}
          />
        )}
        {phase === 'idle' && <span className="text-scale-2 text-canvas-ink/60">Camera inactive</span>}
        {phase === 'starting' && <span className="text-scale-2 text-canvas-ink/60">Starting camera…</span>}
      </div>

      {error && (
        <p role="alert" className="text-scale-2 text-hold">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {phase === 'idle' || phase === 'error' ? (
          <button
            type="button"
            onClick={() => void activate()}
            className="w-fit rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Activate camera
          </button>
        ) : null}

        {phase === 'error' && (
          <button
            type="button"
            onClick={pickUpload}
            className="w-fit rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Upload a photo instead
          </button>
        )}

        {phase === 'starting' && (
          <button type="button" disabled className="w-fit rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-400">
            Activating…
          </button>
        )}

        {phase === 'live' && (
          <button
            type="button"
            onClick={() => void capture()}
            className="w-fit rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Capture frame
          </button>
        )}

        {phase === 'captured' && (
          <button
            type="button"
            onClick={() => void retake()}
            className="w-fit rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Retake
          </button>
        )}

        {showManualUploadLink && (
          <button
            type="button"
            onClick={pickUpload}
            className="text-scale-1 text-steel-400 underline hover:text-steel-200"
          >
            no camera? upload a photo instead
          </button>
        )}
      </div>

      <p className="font-mono text-scale-1 text-steel-400">
        {phase === 'captured'
          ? method === 'upload'
            ? 'face photo uploaded (dev/test — not a live capture)'
            : 'live frame captured'
          : 'live frame required'}
      </p>
    </div>
  );
}
