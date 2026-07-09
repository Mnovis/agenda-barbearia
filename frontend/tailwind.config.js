/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#14110F',
          900: '#1B1714',
          800: '#241F1B',
          700: '#332C26',
        },
        brass: {
          400: '#D4A96A',
          500: '#C1934E',
          600: '#A8793A',
        },
        cream: '#F3EEE6',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
