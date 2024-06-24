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
      },
      animation: {
        "bounce-right": "ease-in-out bounce-right 0.75s",
      },
      keyframes: {
        "bounce-right": {
          "0%": {
            opacity: 0,
            transform: 'translate3d(3000px, 0, 0) scaleX(3)'
          },
          "60%": {
            opacity: 1,
            transform: 'translate3d(-25px, 0, 0) scaleX(1)'
          },
          "75%": {
            transform: 'translate3d(10px, 0, 0) scaleX(0.98)'
          },
          "90%": {
            transform: 'translate3d(-5px, 0, 0) scaleX(0.995)'
          },
          "100%": {
            transform: 'translate3d(0, 0, 0)'
          }
        },
      }
    },
  },
  plugins: [],
}

