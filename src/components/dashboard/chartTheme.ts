/** Shared Recharts styling so every chart in DashboardScreen reads as this
 *  app's chrome, not a generic charting-library demo (FRONTEND_BRIEF.md §4's
 *  design direction, extended to the one screen §10 now allows charts on).
 *  All CSS custom properties, not resolved hex — SVG presentation
 *  attributes participate in the CSS cascade, so `var(--steel-400)` here
 *  repaints on a `data-theme` change exactly like a Tailwind `text-steel-400`
 *  class does, with no JS re-render needed. */

export const CHART_GRID_STROKE = 'var(--shell-600)';
export const CHART_AXIS_STROKE = 'var(--shell-600)';

/** IBM Plex Mono is registered as Tailwind's `font-mono`, not a CSS custom
 *  property — recharts tick/label props take a plain CSS fontFamily string,
 *  not a Tailwind class, so it's named directly here rather than invented
 *  as a token that doesn't otherwise exist. */
export const CHART_FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

export const chartTickStyle = { fill: 'var(--steel-400)', fontSize: 11, fontFamily: CHART_FONT_MONO };
export const chartLegendStyle = { fontSize: 11, fontFamily: CHART_FONT_MONO, color: 'var(--steel-300)' };
