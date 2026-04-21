import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          bg: '#0b0b0d',
          text: '#e8e4d9',
          muted: '#8a8578',
          accent: '#a89a6e',
          rule: '#1f1e1a',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '38rem',
        reading: '44rem',
      },
      keyframes: {
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        riseIn: 'riseIn 700ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
