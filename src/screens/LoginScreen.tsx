import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';

/** Real login, not a dev convenience: officer ID + password against
 *  POST /api/v1/auth/login. On success the backend has already set the
 *  httpOnly session cookie (api/auth.ts's login()); this screen only needs
 *  to record the returned officer in authStore and hand off to the real
 *  entry point. No soft copy on failure — a border officer reads
 *  "AUTHENTICATION FAILED", not an apology. */
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
    <div className="flex h-full flex-1 items-center justify-center bg-shell-900">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex w-full max-w-sm flex-col gap-4 rounded border border-shell-600 bg-shell-800 p-6"
      >
        <h1 className="text-eyebrow text-steel-200">Officer console</h1>

        {expired && (
          <p role="status" className="text-scale-2 text-secondary">
            SESSION EXPIRED — LOG IN AGAIN
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-eyebrow text-steel-400">Officer ID</span>
          <input
            type="text"
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            autoComplete="username"
            autoFocus
            className="rounded border border-shell-600 bg-shell-900 px-2 py-1.5 font-mono text-scale-3 text-steel-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-eyebrow text-steel-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded border border-shell-600 bg-shell-900 px-2 py-1.5 font-mono text-scale-3 text-steel-200"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-steel-200 px-3 py-1.5 text-scale-3 text-shell-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Authenticating…' : 'Log in'}
        </button>

        {error && (
          <p role="alert" className="text-scale-2 text-hold">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
