import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        'cyber-black': '#050508',
        'cyber-dark': '#0a0a0f',
        'cyber-panel': '#0f0f18',
        'cyber-border': '#1a1a2e',
        'cyber-accent': '#00d4ff',
        'cyber-green': '#00ff88',
        'cyber-red': '#ff3366',
        'cyber-amber': '#ffaa00',
        'cyber-purple': '#7c3aed',
        'normal-bg': '#f8f9fb',
        'normal-panel': '#ffffff',
        'normal-border': '#e2e8f0',
        'normal-accent': '#2563eb',
        'normal-text': '#1e293b',
      },
      animation: {
        'scan-line': 'scanLine 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'matrix-rain': 'matrixRain 20s linear infinite',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px var(--accent-color)' },
          '50%': { boxShadow: '0 0 20px var(--accent-color), 0 0 40px var(--accent-color)' },
        },
        slideIn: {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
