/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SN Pro', 'sans-serif']
      },
      colors: {
        brand: {
          50: 'hsl(213, 96%, 96%)',
          100: 'hsl(213, 96%, 92%)',
          500: 'hsl(213, 96%, 56%)',
          600: 'hsl(213, 90%, 48%)',
          900: 'hsl(264, 6%, 17%)'
        }
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px'
      }
    },
  },
  plugins: [],
}
