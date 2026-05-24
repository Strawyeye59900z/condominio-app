import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial do projeto
        brand: {
          DEFAULT: '#133232', // verde escuro principal
          dark: '#0c2222',
          light: '#1d4848',
        },
        ink: {
          DEFAULT: '#0E1419', // preto-azulado para fundos escuros
          soft: '#1a232c',
        },
        bone: {
          DEFAULT: '#E2E4E5', // cinza claro para divisores/superficies
          dark: '#cdd0d2',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-inter)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'typewriter': 'typewriter 2.5s steps(28, end) forwards',
        'blink': 'blink 1s step-end infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: 'currentColor' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-marble': 'linear-gradient(135deg, #0c2222 0%, #133232 50%, #1a3a3a 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0E1419 0%, #0c2222 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
