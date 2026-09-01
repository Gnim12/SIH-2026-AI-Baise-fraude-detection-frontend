import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { APP_NAME, APP_TAGLINE } from '../lib/constants';
import { useAuthStore } from '../store/authStore';

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-2xl font-bold text-steel-200">{value}</span>
      <span className="text-scale-1 uppercase tracking-wide text-steel-400">{label}</span>
    </div>
  );
}

/** Real login, not a dev convenience: officer ID + password against
 *  POST /api/v1/auth/login. On success the backend has already set the
 *  httpOnly session cookie (api/auth.ts's login()); this screen only needs
 *  to record the returned officer in authStore and hand off to the real
 *  entry point. No soft copy on failure — a border officer reads
 *  "AUTHENTICATION FAILED", not an apology.
 *
 *  Split-panel layout (07-login.png): a left brand/context panel (hidden
 *  below `lg` — this is a checkpoint terminal, not a phone flow) and the
 *  actual sign-in form on the right. "Forgot password?" links to
 *  /forgot-password, which — like this screen — sits outside RequireAuth:
 *  the whole point of that flow is to work for an officer who can't get
 *  past this form. */
export function LoginScreen() {
  const navigate = useNavigate();
  const setOfficer = useAuthStore((s) => s.setOfficer);
  const expired = useAuthStore((s) => s.sessionExpired);

  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = officerId.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const officer = await login(officerId.trim(), password);
      setOfficer(officer);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AUTHENTICATION FAILED');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-1 bg-shell-900">
      {/* Left: brand/context panel. Static copy, no interactive content,
          so it's fine that it disappears below `lg`. */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-shell-900 p-10 lg:flex">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded border border-steel-400">
            <span className="h-2 w-2 rounded-full bg-clear" aria-hidden="true" />
          </span>
          <span className="text-eyebrow text-steel-300">
            {APP_NAME} · {APP_TAGLINE.toUpperCase()}
          </span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-steel-200">
              Document &amp; identity screening
            </h2>
            <p className="max-w-md text-scale-3 text-steel-400">
              Checkpoint access is restricted to authorised personnel. All activity on this terminal is logged and
              attributable to your officer ID.
            </p>
          </div>
          <div className="flex gap-10">
            <Stat value="1.3s" label="Avg. screening time" />
            <Stat value="15" label="Fraud patterns covered" />
            <Stat value="24/7" label="Offline-capable" />
          </div>
        </div>
      </div>

      {/* Right: the actual sign-in form. */}
      <div className="flex w-full flex-1 flex-col justify-center bg-shell-800 px-8 py-10 lg:w-[440px] lg:flex-none lg:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow text-steel-400">Officer sign-in</span>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-steel-200">
              Lane terminal access
            </h1>
          </div>

          {expired && (
            <p role="status" className="text-scale-2 text-secondary">
              SESSION EXPIRED — LOG IN AGAIN
            </p>
          )}

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
              <span className="text-eyebrow text-steel-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="rounded border border-shell-600 bg-shell-900 px-3 py-2.5 font-mono text-scale-3 text-steel-200"
              />
            </label>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-scale-2 text-steel-300 underline hover:text-steel-200">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-steel-200 px-3 py-2.5 text-scale-3 font-semibold uppercase tracking-wide text-shell-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Authenticating…' : 'Sign in'}
            </button>
          </form>

          <div className="flex justify-between text-scale-1 uppercase tracking-wide text-steel-400">
            <span>Build v0.9.2</span>
            <span>Session timeout: 8h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
