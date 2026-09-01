import { create } from 'zustand';

/** Lane/terminal is a physical-booth config, not an officer identity --
 *  it stays query-param-driven for dev/demo convenience independently of
 *  who's logged in. Officer identity now comes from authStore (the real
 *  logged-in officer, populated after POST /auth/login or GET /auth/me) --
 *  removed here deliberately, not an oversight; see store/authStore.ts. */
interface SettingsStore {
  laneId: string;
  watchlistSyncedAt: string | null;
}

function fromQueryParam(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get(name);
  return value ?? fallback;
}

export const useSettingsStore = create<SettingsStore>(() => ({
  laneId: fromQueryParam('lane', 'IGI-T3-LANE-07'),
  watchlistSyncedAt: null,
}));
