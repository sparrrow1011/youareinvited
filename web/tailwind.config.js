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
        // ── Authenticated app (dark theme) — DO NOT CHANGE ──
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        light: '#a8dadc',

        // ── Landing page light theme ──
        brand: '#006b5f',
        'brand-dim': '#005e53',
        'brand-container': '#73f2dd',
        'on-brand-container': '#00594f',
        warm: '#a04223',
        tertiary: '#b91156',
        'tertiary-container': '#ff9cb3',
        'lp-background': '#f9f9fb',
        'on-lp-background': '#2f3336',
        'on-surface': '#2f3336',
        'on-surface-variant': '#5c5f63',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f6',
        'surface-container': '#eceef1',
        'surface-container-high': '#e6e8ec',
        'secondary-container': '#ffdbd0',
        'on-secondary-container': '#8e3517',
        'outline-variant': '#afb2b6',
        outline: '#777b7f',
      },
      fontFamily: {
        headline: ['var(--font-noto-serif)', 'Georgia', 'serif'],
        body: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        label: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s ease forwards',
      },
    },
  },
  plugins: [],
};
