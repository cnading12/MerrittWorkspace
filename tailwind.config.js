/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'burnt-orange': {
          50: '#fef7ed',
          100: '#fdecd4',
          200: '#fad5a8',
          300: '#f6b871',
          400: '#f19238',
          500: '#ed7611',
          600: '#de5f07',
          700: '#b84908',
          800: '#933b0e',
          900: '#77320f',
          950: '#411804',
        },
      },
      fontFamily: {
        helvetica: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}