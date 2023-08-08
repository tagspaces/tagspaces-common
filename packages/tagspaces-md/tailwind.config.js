/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,css}'],
  darkMode: 'class',
  theme: {
    extend: {
      /*typography: {
        DEFAULT: {
          maxWidth: '100%'
        }
      }*/
    }
  },
  future: {
    hoverOnlyWhenSupported: true
  },
  plugins: [require('@tailwindcss/typography'), require('tailwind-nord')],
  purge: ['.prose']
};
