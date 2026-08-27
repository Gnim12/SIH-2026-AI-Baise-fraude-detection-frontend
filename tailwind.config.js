/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // instrument shell
        shell: {
          900: 'var(--shell-900)',
          800: 'var(--shell-800)',
          700: 'var(--shell-700)',
          600: 'var(--shell-600)',
        },
        steel: {
          400: 'var(--steel-400)',
          200: 'var(--steel-200)',
        },
        // document canvas
        canvas: {
          DEFAULT: 'var(--canvas)',
          ink: 'var(--canvas-ink)',
          rule: 'var(--canvas-rule)',
        },
        // verdict — semantic only, never decorative. See FRONTEND_BRIEF §4.
        clear: 'var(--clear)',
        secondary: 'var(--secondary)',
        hold: 'var(--hold)',
        abstain: 'var(--abstain)',
        recapture: 'var(--recapture)',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      // Additive scale keys (§4) — kept separate from Tailwind's default
      // text-* scale so existing utilities elsewhere are undisturbed.
      fontSize: {
        'scale-1': '0.6875rem',
        'scale-2': '0.8125rem',
        'scale-3': '0.9375rem',
        'scale-4': '1.125rem',
        'scale-5': '1.5rem',
        'scale-6': '2.75rem',
      },
    },
  },
  plugins: [],
};
