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
      },
      transitionTimingFunction: {
        // Strong ease-out (Emil's UI curve) as the app-wide default, so every
        // Tailwind transition-* utility gets a crisp, intentional feel instead
        // of the weak built-in cubic-bezier(0.4, 0, 0.2, 1).
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)'
      }
    },
  },
  plugins: [],
}
