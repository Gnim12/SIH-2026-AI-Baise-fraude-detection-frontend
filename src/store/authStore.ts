import { create } from 'zustand';

export interface Officer {
  id: number;
  officerId: string;
  name: string;
  role: string;
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthStore {
  officer: Officer | null;
  /** 'checking': the app-load GET /auth/me hasn't resolved yet (AppShell's
   *  initial effect) — routes must not render the wrong screen during this
   *  window. 'authenticated'/'unauthenticated' are the settled states. */
  status: AuthStatus;
  /** Set by expireSession() (a WS 4401 mid-session) rather than a plain
   *  never-logged-in visit, so LoginScreen can show a distinct "session
   *  expired" message. Cleared on the next successful login. Deliberately
   *  store state, not a /login?reason=expired query param: routing the
   *  redirect exclusively through RequireAuth (which reacts to `status`)
   *  means there is exactly one place that ever navigates to /login on
   *  logout/expiry, instead of two navigations racing to set the URL. */
  sessionExpired: boolean;
  setOfficer: (officer: Officer) => void;
  clear: () => void;
  expireSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  officer: null,
  status: 'checking',
  sessionExpired: false,
  setOfficer: (officer) => set({ officer, status: 'authenticated', sessionExpired: false }),
  clear: () => set({ officer: null, status: 'unauthenticated' }),
  expireSession: () => set({ officer: null, status: 'unauthenticated', sessionExpired: true }),
}));
