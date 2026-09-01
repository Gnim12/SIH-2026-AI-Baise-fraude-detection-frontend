/** Maps a getUserMedia() rejection to a plain technical error line — no
 *  crash, no silent failure, per this project's honesty standard for
 *  anything that can fail on real hardware. */
export function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission denied — grant camera access in the browser to continue.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera device detected.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is in use by another application.';
  }
  const message = err instanceof Error ? err.message : String(err);
  return `Camera unavailable — ${message}`;
}

/** Snapshots the current video frame to a JPEG Blob via an offscreen
 *  canvas. In jsdom (no `canvas` npm package installed) getContext('2d')
 *  returns null — that path resolves an empty stand-in Blob instead of
 *  hanging on a toBlob() callback that jsdom never invokes; a real browser
 *  always has a 2d context and takes the real path. */
export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve(new Blob([], { type: 'image/jpeg' }));
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? new Blob([], { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCountdown(elapsedSec: number, capSec: number): string {
  const pad = (n: number) => String(Math.min(n, capSec)).padStart(2, '0');
  return `00:${pad(elapsedSec)} / 00:${pad(capSec)}`;
}
