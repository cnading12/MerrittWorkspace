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
        // Kept as-is: the portal and admin surfaces reference this scale.
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
        // Warm neutrals for the marketing site. These sit beside the
        // building's burnt orange concrete floors rather than competing
        // with them — every cool gray reads wrong against those photos.
        bone: '#F7F4EF',   // page ground, replaces pure white
        linen: '#EFE9E1',  // alternating band, replaces gray-50
        clay: '#DCD3C8',   // hairline rules, replaces gray-200
        ink: '#1A1613',    // text and dark bands, warm black
        'ink-60': '#6B625A', // secondary text, replaces gray-600
        // #de5f07 is the accent; accent-deep is the only step that passes
        // AA for orange text below 18.66px bold.
        accent: '#de5f07',
        'accent-deep': '#A8460A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'Helvetica', 'Arial', 'sans-serif'],
        // Alias retained so existing `font-helvetica` usages keep resolving.
        helvetica: ['var(--font-body)', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.035em',
      },
    },
  },
  plugins: [],
}
