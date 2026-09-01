import { API_BASE } from './client';
import type { DocType } from '../types/screening';

export interface CaptureDocumentInput {
  docType: DocType;
  file: File;
}

export interface CaptureSubmission {
  documents: CaptureDocumentInput[];
  liveFrame: Blob;
  // 'upload' marks LiveFaceCapture.tsx's dev/test file-upload fallback, so
  // the backend never conflates it with an actual live capture (see
  // FaceResult.capture_method, app/contracts/session.py).
  liveFrameCaptureMethod: 'live' | 'upload';
  videoSweep?: Blob;
  checkpointId: string;
  officerId: string;
}

/** POST /api/v1/screening, multipart (BACKEND_BRIEF.md §7: "multipart ->
 *  201 {session_id, status:'processing'}"). The mock server does not parse
 *  this body yet (see mock/server.mjs) — it drains it, mints a sessionId,
 *  and always queues case-01-genuine's tape. Field names below are this
 *  frontend's own choice, since no real backend exists yet to dictate one;
 *  keep them if/when the mock server starts actually reading the body. */
export async function submitCapture(payload: CaptureSubmission): Promise<{ sessionId: string }> {
  const form = new FormData();
  form.append('documentCount', String(payload.documents.length));
  payload.documents.forEach((doc, i) => {
    form.append(`document_${i}_type`, doc.docType);
    form.append(`document_${i}`, doc.file, doc.file.name);
  });
  form.append('liveFrame', payload.liveFrame, 'live-frame.jpg');
  form.append('liveFrameCaptureMethod', payload.liveFrameCaptureMethod);
  if (payload.videoSweep) {
    form.append('videoSweep', payload.videoSweep, 'sweep.webm');
  }
  form.append('checkpointId', payload.checkpointId);
  form.append('officerId', payload.officerId);

  const res = await fetch(`${API_BASE}/api/v1/screening`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) throw new Error(`submitCapture failed: ${res.status}`);
  return res.json();
}
