import { API_BASE } from './client';
import type { Officer } from '../store/authStore';

/** POST /api/v1/auth/login {officer_id, password} -> {officer}. The session
 *  itself lives only in the httpOnly cookie the response sets (never in
 *  this body) — `credentials: 'include'` is what makes the browser store
 *  and later resend that cookie at all, since login is cross-origin in dev
 *  (Vite :5173/:5174 -> backend :8000). */
export async function login(officerId: string, password: string): Promise<Officer> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officer_id: officerId, password }),
  });
  if (res.status === 401) throw new Error('AUTHENTICATION FAILED — CHECK OFFICER ID AND PASSWORD');
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const body = (await res.json()) as { officer: Officer };
  return body.officer;
}

/** Real server-side revocation (app/auth/routes.py) — the cookie is also
 *  cleared, but the session row is gone either way, not just forgotten
 *  client-side. */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
}

export interface ResetRequestResult {
  referenceCode: string;
  message: string;
}

/** POST /api/v1/auth/reset-requests {officer_id, reason} -> {referenceCode,
 *  message}. Public/unauthenticated on purpose — see app/auth/routes.py's
 *  request_password_reset docstring — so no `credentials: 'include'` here,
 *  unlike login/logout/fetchMe: there is no session cookie to send or
 *  receive on this endpoint. Deliberately does not special-case any status
 *  in a way that would let the UI distinguish "officer_id exists" from
 *  "officer_id doesn't" — the backend's response is already identical
 *  either way, and the one thing worth surfacing distinctly is 429 (rate
 *  limited), which is a caller-visible, non-sensitive outcome. */
export async function requestPasswordReset(officerId: string, reason: string): Promise<ResetRequestResult> {
  const res = await fetch(`${API_BASE}/api/v1/auth/reset-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officer_id: officerId, reason: reason.trim() || null }),
  });
  if (res.status === 429) throw new Error('TOO MANY REQUESTS — TRY AGAIN LATER');
  if (!res.ok) throw new Error(`reset request failed: ${res.status}`);
  return (await res.json()) as ResetRequestResult;
}

/** GET /api/v1/auth/me — "am I still logged in". Called once on app load
 *  (AppShell) to decide whether to show the console or redirect to
 *  /login; null (not a thrown error) on 401, since that is the expected,
 *  common "not logged in yet" outcome, not a failure. */
export async function fetchMe(): Promise<Officer | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);
  const body = (await res.json()) as { officer: Officer };
  return body.officer;
}
