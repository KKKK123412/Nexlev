/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NEXLEV brand palette — deep void with signal green
        void: {
          950: '#040608',
          900: '#080c10',
          800: '#0d1117',
          700: '#161b22',
          600: '#21262d',
          500: '#30363d',
          400: '#484f58',
        },
        signal: {
          DEFAULT: '#00ff87',
          dim: '#00cc6a',
          muted: '#00ff8720',
          faint: '#00ff8710',
        },
        amber: {
          signal: '#ffb800',
          muted: '#ffb80020',
        },
        rose: {
          signal: '#ff4757',
          muted: '#ff475720',
        },
        blue: {
          signal: '#4fc3f7',
          muted: '#4fc3f720',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
