import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LaneHeader } from './LaneHeader';
import { RequireAuth } from './RequireAuth';
import { CaptureScreen } from '../capture/CaptureScreen';
import { LaneScreen } from '../../screens/LaneScreen';
import { HistoryScreen } from '../../screens/HistoryScreen';
import { SessionDetail } from '../../screens/SessionDetail';
import { LoginScreen } from '../../screens/LoginScreen';
import { ForgotPasswordScreen } from '../../screens/ForgotPasswordScreen';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { fetchMe, logout } from '../../api/auth';
import type { ConnectionState } from '../../api/socket';
import { APP_NAME } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

/** "/" is the pre-session capture step (document image(s), live face
 *  frame, optional video sweep); it POSTs and navigates to
 *  /lane/:sessionId, which mounts the live screening view against that
 *  session's WS stream. LaneHeader is the instrument shell's outermost
 *  chrome and stays mounted across all four — connection state is only
 *  meaningful on the lane route, where the only live WS connection lives.
 *
 *  Auth: on mount, GET /auth/me decides whether an officer is already
 *  logged in (a page refresh, or returning after closing the tab) --
 *  authStore starts 'checking' and this is the one place that settles it.
 *  Every route except /login and /forgot-password is gated behind RequireAuth, which redirects
 *  to /login once status resolves to 'unauthenticated'. A WS 4401 mid-
 *  session (socket.ts's 'expired' status -- session revoked or simply
 *  expired) and an explicit log-out both go through the SAME path: flip
 *  authStore's status to 'unauthenticated' and let RequireAuth's own
 *  <Navigate> do the redirect. Deliberately not a second, separate
 *  navigate() call here -- two navigations racing to set the post-logout
 *  URL is exactly the kind of subtly-wrong thing this milestone's brief
 *  called out, and it is real: an earlier version of this effect called
 *  navigate() itself and RequireAuth's own redirect would sometimes win
 *  the race and overwrite it before the first one's target (the
 *  session-expired flag) ever rendered. See authStore.ts's sessionExpired
 *  field for how that flag survives without a race-prone query param. */
export function AppShell() {
  const laneId = useSettingsStore((s) => s.laneId);
  const status = useAuthStore((s) => s.status);
  const officer = useAuthStore((s) => s.officer);
  const setOfficer = useAuthStore((s) => s.setOfficer);
  const clearAuth = useAuthStore((s) => s.clear);
  const expireSession = useAuthStore((s) => s.expireSession);
  const [connectionState, setConnectionState] = useState<ConnectionState>('reconnecting');

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((result) => {
        if (cancelled) return;
        if (result) setOfficer(result);
        else clearAuth();
      })
      .catch(() => {
        if (!cancelled) clearAuth();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connectionState !== 'expired') return;
    expireSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  async function handleLogout() {
    await logout().catch(() => {});
    clearAuth();
  }

  if (status === 'checking') {
    // Blocks ALL routes, /login included, until the initial /auth/me
    // resolves -- otherwise an already-logged-in officer would flash the
    // login form (or vice versa) for one render.
    return (
      <div className="flex h-screen items-center justify-center bg-shell-900">
        <span className="text-eyebrow text-steel-400">Verifying session…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {status === 'authenticated' && (
        <LaneHeader
          laneId={laneId}
          officerId={officer?.officerId ?? ''}
          connectionState={connectionState}
          watchlistSyncedAt={null}
          onLogout={() => void handleLogout()}
        />
      )}
      <div className="min-h-0 flex-1">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<CaptureScreen />} />
            <Route path="/lane/:sessionId" element={<LaneScreen onConnectionStateChange={setConnectionState} />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/history/:sessionId" element={<SessionDetail />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}
