import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/** Layout route guard for every protected path ("/", "/lane/*",
 *  "/history*" — AppShell's <Route element={<RequireAuth />}> wrapper).
 *  AppShell itself blocks on authStore's 'checking' state before this ever
 *  renders, so by the time RequireAuth runs, status is settled to either
 *  'authenticated' or 'unauthenticated'. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
