/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['IBM Plex Mono', 'sans-serif'],
      },
      animation: {
        "bounce-right-in": "ease-in-out bounce-right-in 0.75s",
        "bounce-right-out": "ease-in-out bounce-right-out 0.75s",
      },
      keyframes: {
        "bounce-right-in": {
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
        "bounce-right-out": {
          "20%": {
            opacity: 1,
            transform: 'translate3d(-20px, 0, 0)'
          },
          "100%": {
            opacity: 0,
            transform: 'translate3d(2000px, 0, 0)'
          }
        }
      }
    },
  },
  plugins: [],
}

