/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        navy: {
          900: '#0f1f35',
          800: '#162840',
          700: '#1d3454',
          600: '#243f68',
          500: '#2d5080',
        },
        brand: '#2563eb',
        surface: '#f0f4f8',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        cardHover: '0 4px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
        navbar: '0 2px 12px rgba(15,31,53,0.15)',
      },
    },
  },
  plugins: [],
}