import { create } from 'zustand';

/** User-facing choice. 'system' tracks the OS preference reactively and is
 *  never itself persisted — persisting it would be indistinguishable from
 *  not persisting anything, and an explicit 'light'/'dark' choice must
 *  survive a page reload while 'system' must keep reacting to OS changes. */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'officer-console-theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function storedPreference(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

/** :root already carries the dark values (the CSS's own default), so only
 *  data-theme="light" has a corresponding override block in index.css —
 *  applying data-theme="dark" is harmless (nothing overrides :root) but
 *  keeps the DOM state explicit for anyone inspecting it. */
function applyToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

interface ThemeStore {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const initialPreference: ThemePreference = storedPreference() ?? 'system';
const initialResolved = resolve(initialPreference);
applyToDocument(initialResolved);

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: initialPreference,
  resolved: initialResolved,
  setPreference: (preference) => {
    if (typeof window !== 'undefined') {
      if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, preference);
    }
    const resolved = resolve(preference);
    applyToDocument(resolved);
    set({ preference, resolved });
  },
}));

// Keep 'system' reactive to OS-level changes for as long as the user has
// never overridden it. A stale-closure read of `preference` here would
// silently stop reacting the moment the user later flips back to
// 'system' from an override -- so this always re-reads current state via
// getState() rather than capturing `preference` at listener-registration
// time.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (useThemeStore.getState().preference !== 'system') return;
    const resolved = resolve('system');
    applyToDocument(resolved);
    useThemeStore.setState({ resolved });
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onSystemChange);
  } else if (typeof media.addListener === 'function') {
    // Safari < 14
    media.addListener(onSystemChange);
  }
}
