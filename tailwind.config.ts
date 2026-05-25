import type { Config } from 'tailwindcss';

// Tema oscuro elegante con acentos dorados — paleta de Foco 360°.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Fondo principal y variantes
        bg: {
          DEFAULT: '#0a0a0a',
          elevated: '#141414',
          card: '#1a1a1a',
          hover: '#222222',
        },
        // Acento dorado (la marca)
        gold: {
          DEFAULT: '#d4af37',
          light: '#e8c95a',
          dark: '#a8861f',
        },
        // Bordes y separadores
        border: {
          DEFAULT: '#2a2a2a',
          light: '#3a3a3a',
        },
        // Texto
        text: {
          DEFAULT: '#f5f5f5',
          muted: '#a0a0a0',
          subtle: '#707070',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Tipografía display elegante (estilo logo / nombre de proyecto).
        // Solo para overlays del visor — el resto sigue con Inter.
        display: ['Cinzel', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(212, 175, 55, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
