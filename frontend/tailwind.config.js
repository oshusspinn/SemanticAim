/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e0faff',
          100: '#b3f2ff',
          200: '#80e8ff',
          300: '#4ddbff',
          400: '#26d2ff',
          500: '#00aeef',
          600: '#009ad4',
          700: '#0081b3',
          800: '#006891',
          900: '#004f6f',
        }
      }
    },
  },
  plugins: [],
}
