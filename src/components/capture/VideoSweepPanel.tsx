import { useEffect, useRef, useState } from 'react';
import { describeCameraError, formatCountdown } from '../../lib/camera';

const SWEEP_CAP_SEC = 3;

type Phase = 'idle' | 'recording' | 'done' | 'error';

interface VideoSweepPanelProps {
  onSweepChange: (blob: Blob | null) => void;
}

/** Optional MediaRecorder-based video sweep, capped at 3s (§ Video sweep).
 *  Purely optional — never gates START SCREENING — but the status line
 *  always states the real consequence of skipping it, same honesty
 *  principle as CoverageBanner elsewhere in this app: absence of a check
 *  is stated plainly, never hidden or dressed up as a pass. */
export function VideoSweepPanel({ onSweepChange }: VideoSweepPanelProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function record() {
    setPhase('recording');
    setError('');
    setElapsedSec(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (intervalRef.current) clearInterval(intervalRef.current);
        const blob = new Blob(chunks, { type: 'video/webm' });
        setPhase('done');
        onSweepChange(blob);
      };

      recorder.start();
      intervalRef.current = setInterval(() => {
        setElapsedSec((s) => Math.min(s + 1, SWEEP_CAP_SEC));
      }, 1000);
      setTimeout(() => recorder.stop(), SWEEP_CAP_SEC * 1000);
    } catch (err) {
      setPhase('error');
      setError(describeCameraError(err));
    }
  }

  function retake() {
    onSweepChange(null);
    setPhase('idle');
    setElapsedSec(0);
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-shell-600 bg-shell-800 p-3">
      <h2 className="text-eyebrow text-steel-300">Video sweep</h2>

      <div className="flex items-center gap-3">
        <span className="font-mono text-scale-3 text-steel-200">{formatCountdown(elapsedSec, SWEEP_CAP_SEC)}</span>
        {phase === 'idle' && (
          <button
            type="button"
            onClick={() => void record()}
            className="rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Record sweep
          </button>
        )}
        {phase === 'recording' && (
          <span className="flex items-center gap-1.5 text-scale-2 text-hold">
            <span aria-hidden="true">●</span> recording
          </span>
        )}
        {phase === 'done' && (
          <button
            type="button"
            onClick={retake}
            className="rounded border border-shell-600 px-3 py-1.5 text-scale-2 text-steel-200 hover:bg-shell-700"
          >
            Retake
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-scale-2 text-hold">
          {error}
        </p>
      )}

      <p className="text-scale-2 text-steel-400">
        {phase === 'done'
          ? 'Video sweep captured — hologram check will run.'
          : 'Video sweep not captured — hologram check will be skipped.'}
      </p>
    </div>
  );
}
