import { create } from 'zustand';

interface SettingsStore {
  laneId: string;
  officerId: string;
  watchlistSyncedAt: string | null;
}

function fromQueryParam(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get(name);
  return value ?? fallback;
}

export const useSettingsStore = create<SettingsStore>(() => ({
  laneId: fromQueryParam('lane', 'IGI-T3-LANE-07'),
  officerId: fromQueryParam('officer', 'OFF-2291'),
  watchlistSyncedAt: null,
}));
