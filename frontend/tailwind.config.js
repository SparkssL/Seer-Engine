/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        sand: 'var(--sand)',
        cloud: 'var(--cloud)',
        accent: 'var(--accent)',
        'accent-glow': 'var(--accent-glow)',
        mystic: 'var(--mystic-blue)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Cinzel', 'serif'], // Added for medieval feel if needed
      },
    },
  },
  plugins: [],
}
