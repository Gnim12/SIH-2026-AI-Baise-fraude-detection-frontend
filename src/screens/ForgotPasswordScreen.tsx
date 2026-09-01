import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';

/** Officer-initiated "I can't log in" request against the real, public
 *  POST /api/v1/auth/reset-requests (app/auth/routes.py) — outside
 *  RequireAuth for exactly the reason that endpoint is unauthenticated:
 *  the officer filing this is often the one who can't sign in at all.
 *
 *  08-forgot-password.png / 09-forgot-password-sent.png: a single centered
 *  card that swaps its contents between the request form and a
 *  confirmation state carrying the real reference code the backend
 *  returned — never a client-generated placeholder. */
export function ForgotPasswordScreen() {
  const [officerId, setOfficerId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const canSubmit = officerId.trim().length > 0 && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await requestPasswordReset(officerId.trim(), reason);
      setReferenceCode(result.referenceCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'REQUEST FAILED');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-1 items-center justify-center bg-shell-900 px-4">
      <div className="w-full max-w-md rounded-lg border border-shell-600 bg-shell-800 p-10">
        {referenceCode ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-clear">
              <Check aria-hidden="true" className="h-6 w-6 text-clear" />
            </span>

            <div className="flex flex-col gap-3">
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-steel-200">
                Request submitted
              </h1>
              <p className="text-scale-3 text-steel-400">
                Your supervisor has been notified. You&apos;ll be contacted directly with a temporary password —
                continue using your current one until then.
              </p>
            </div>

            <div className="rounded border border-shell-600 px-4 py-2 font-mono text-scale-3 text-steel-300">
              REQUEST REF: {referenceCode}
            </div>

            <Link
              to="/login"
              className="w-full rounded bg-shell-700 px-3 py-2.5 text-center text-scale-3 font-semibold uppercase tracking-wide text-steel-200 hover:bg-shell-600"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-eyebrow text-steel-400 hover:text-steel-300"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to sign in
            </Link>

            <div className="flex flex-col gap-1">
              <span className="text-eyebrow text-steel-400">Password reset</span>
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-steel-200">
                Request assistance
              </h1>
              <p className="text-scale-3 text-steel-400">
                Password resets are handled by your shift supervisor or system administrator. Submit a request below
                and continue using your current password until it is confirmed changed.
              </p>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-3 rounded border-l-2 border-hold bg-hold-badge px-4 py-3 text-scale-2 text-hold">
                <span aria-hidden="true" className="mt-0.5 h-2 w-2 shrink-0 rounded-full border border-hold" />
                {error}
              </p>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-eyebrow text-steel-400">Officer ID</span>
                <input
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="rounded border border-shell-600 bg-shell-900 px-3 py-2.5 font-mono text-scale-3 text-steel-200"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-eyebrow text-steel-400">Reason (optional)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. forgot password, suspected compromise"
                  className="resize-none rounded border border-shell-600 bg-shell-900 px-3 py-2.5 font-mono text-scale-3 text-steel-200 placeholder:text-steel-400/60"
                />
              </label>

              <p className="rounded border-l-2 border-shell-600 bg-shell-700 px-4 py-3 text-scale-2 text-steel-300">
                An administrator will reset your password and provide a temporary one directly. This request does
                not lock or disable your current account.
              </p>

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded bg-steel-200 px-3 py-2.5 text-scale-3 font-semibold uppercase tracking-wide text-shell-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
