import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** themeStore reads localStorage + matchMedia once at module load time
 *  (so the very first paint is correct with no flash-of-wrong-theme) --
 *  which means every test needs a fresh module instance with its own
 *  mocked environment, not a shared import. vi.resetModules() plus a
 *  dynamic import() per test achieves that. */

type MediaListener = () => void;

function mockMatchMedia(prefersDark: boolean) {
  const listeners: MediaListener[] = [];
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: MediaListener) => listeners.push(cb),
    removeEventListener: (_: string, cb: MediaListener) => {
      const i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    },
    addListener: (cb: MediaListener) => listeners.push(cb),
    removeListener: (cb: MediaListener) => {
      const i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    flip: (nowPrefersDark: boolean) => {
      mql.matches = nowPrefersDark;
      listeners.forEach((cb) => cb());
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('themeStore', () => {
  it('defaults to system, resolving to dark when the OS prefers dark', async () => {
    mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().preference).toBe('system');
    expect(useThemeStore.getState().resolved).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to system, resolving to light when the OS prefers light', async () => {
    mockMatchMedia(false);
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().preference).toBe('system');
    expect(useThemeStore.getState().resolved).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('an explicit choice persists to localStorage and survives reload', async () => {
    mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    useThemeStore.getState().setPreference('light');
    expect(window.localStorage.getItem('officer-console-theme')).toBe('light');

    vi.resetModules();
    const { useThemeStore: reloaded } = await import('./themeStore');
    expect(reloaded.getState().preference).toBe('light');
    expect(reloaded.getState().resolved).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('switching back to system clears the stored override', async () => {
    mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    useThemeStore.getState().setPreference('dark');
    expect(window.localStorage.getItem('officer-console-theme')).toBe('dark');
    useThemeStore.getState().setPreference('system');
    expect(window.localStorage.getItem('officer-console-theme')).toBeNull();
  });

  it('while on system, a live OS change updates the resolved theme reactively', async () => {
    const media = mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().resolved).toBe('dark');

    media.flip(false);
    expect(useThemeStore.getState().resolved).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('an explicit override is NOT disturbed by a live OS change', async () => {
    const media = mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    useThemeStore.getState().setPreference('dark');

    media.flip(false); // OS flips to light, but the user pinned 'dark'
    expect(useThemeStore.getState().preference).toBe('dark');
    expect(useThemeStore.getState().resolved).toBe('dark');
  });
});
