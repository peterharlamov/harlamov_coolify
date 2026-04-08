/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecf8f6',
          100: '#d4f0ea',
          500: '#0f766e',
          600: '#0d655f',
          700: '#0b5651',
        },
      },
      boxShadow: {
        soft: '0 10px 35px rgba(15, 23, 42, 0.08)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.45s ease-out both',
      },
    },
  },
  plugins: [],
};
