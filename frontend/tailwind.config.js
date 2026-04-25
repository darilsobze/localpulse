/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['"GT Sectra"', 'Tiempos', 'ui-serif', 'serif'],
      },
      colors: {
        ink: '#0a0a0f',
        paper: '#faf6f0',
      },
      animation: {
        'pulse-slow': 'pulseSlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 16s ease-in-out infinite',
        'mote': 'mote 14s linear infinite',
        'breathe': 'breathe 8s ease-in-out infinite',
      },
      keyframes: {
        pulseSlow: {
          '0%,100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        mote: {
          '0%': { transform: 'translateY(110vh) translateX(0)', opacity: '0' },
          '10%': { opacity: '0.7' },
          '90%': { opacity: '0.7' },
          '100%': { transform: 'translateY(-10vh) translateX(60px)', opacity: '0' },
        },
        breathe: {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
