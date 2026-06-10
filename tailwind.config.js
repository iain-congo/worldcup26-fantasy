/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        dark: {
          900: '#0A0A0F',
          800: '#12121A',
          700: '#1A1A27',
          600: '#22223A',
          500: '#2D2D4E',
        }
      }
    },
  },
  plugins: [],
}
