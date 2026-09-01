/** Single source of truth for the product name — every user-facing surface
 *  that names the app (document title, login branding, header brand mark,
 *  ...) reads from here instead of a separately hardcoded "RAKSHAK" string,
 *  so a future rename is a one-line change. index.html's static <title> is
 *  the one unavoidable exception (it renders before any JS runs) — AppShell
 *  overwrites document.title from APP_NAME on mount, so the app-controlled
 *  title still traces back to this constant. */
export const APP_NAME = 'RAKSHAK';
export const APP_TAGLINE = 'Border Document Intelligence';
