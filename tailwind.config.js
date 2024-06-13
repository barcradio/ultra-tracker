/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Kanit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

