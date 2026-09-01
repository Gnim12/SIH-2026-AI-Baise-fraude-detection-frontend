import type { Decision, ScreeningSession } from '../types/screening';

// Defaults to the mock server (npm run mock, port 8787). Point at the real
// FastAPI backend (BACKEND_BRIEF.md §7) with a .env.local:
//   VITE_API_BASE=http://localhost:8000
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';

/** Fixture asset URLs (imageUrl, views.*) are server-relative paths served by
 *  the mock server, not by the Vite dev server — resolve them against
 *  API_BASE rather than the page's own origin. */
export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface CaseSummary {
  id: string;
  title: string;
}

export async function fetchCases(): Promise<CaseSummary[]> {
  const res = await fetch(`${API_BASE}/api/v1/cases`, { credentials: 'include' });
  if (!res.ok) throw new Error(`fetchCases failed: ${res.status}`);
  return res.json();
}

export async function startScreening(caseId: string): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/v1/screening`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId }),
  });
  if (!res.ok) throw new Error(`startScreening failed: ${res.status}`);
  return res.json();
}

/** Persists the officer's decision against the mock server so it survives
 *  in /api/v1/history (§5.5, §6). Posts the full accumulated session
 *  alongside the decision fields — the server only replays tapes and never
 *  tracks session state itself, so the client is the only party with the
 *  complete picture to seal.
 *
 *  MOCK-SHAPE WARNING, do not carry this body shape to the real backend:
 *  BACKEND_BRIEF.md §7 defines the real endpoint as
 *  `POST /api/v1/screening/{id}/decision {decision, note}` — decision and
 *  note ONLY. The real backend already holds session state server-side
 *  (§8.1/§8.2's audit chain), and it computes `override` itself by
 *  comparing `decision` to the system's own recorded band rather than
 *  trusting a client-sent flag. This function's `session` param and the
 *  `override`/`session` body fields exist purely to make the mock server's
 *  stateless replay produce a real GET /api/v1/history — swapping this one
 *  function to the real minimal `{decision, note}` body (dropping both) is
 *  the entire migration; DecisionBar and sessionStore never see the wire
 *  shape and need no changes. */
export async function submitDecision(
  session: ScreeningSession,
  decision: Decision,
  note: string,
  override: boolean,
): Promise<ScreeningSession> {
  const res = await fetch(`${API_BASE}/api/v1/screening/${session.sessionId}/decision`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, note, override, session }),
  });
  if (!res.ok) throw new Error(`submitDecision failed: ${res.status}`);
  return res.json();
}

export async function fetchHistory(): Promise<ScreeningSession[]> {
  const res = await fetch(`${API_BASE}/api/v1/history`, { credentials: 'include' });
  if (!res.ok) throw new Error(`fetchHistory failed: ${res.status}`);
  return res.json();
}

export async function fetchHistoryEntry(sessionId: string): Promise<ScreeningSession | null> {
  const res = await fetch(`${API_BASE}/api/v1/history/${encodeURIComponent(sessionId)}`, {
    credentials: 'include',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchHistoryEntry failed: ${res.status}`);
  return res.json();
}
