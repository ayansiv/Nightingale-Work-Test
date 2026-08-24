/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Research-tooling vernacular (spec §17): paper-white ground, ink text, one restrained
        // accent for the user marker. Deliberately not cream-and-serif, not dark-with-acid.
        ground: { DEFAULT: '#ffffff', sunk: '#f7f7f5', line: '#e5e4e0' },
        ink: { DEFAULT: '#1a1a18', muted: '#5c5b56', faint: '#8a8985' },
        user: '#1c4ed8',
        house: '#b45309',
        derived: '#0f766e',
        assigned: '#a16207',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
    },
  },
  plugins: [],
};
