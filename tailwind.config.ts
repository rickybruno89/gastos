import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        money: '#3bb272',
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
        roboto: ['var(--font-roboto)'],
        lusitana: ['var(--font-lusitana)'],
        kanit: ['var(--font-kanit)'],
      },
      rotate: {
        'y-180': 'rotateY(180deg)',
      },
    },
  },

  plugins: [require('@tailwindcss/forms'), require('tailwindcss-animate')],
}
export default config
