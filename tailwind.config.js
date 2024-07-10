const { createThemes } = require('tw-colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{ts,tsx}"
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
    },
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
  plugins: [
    createThemes({
      dark: {
        surface: {
          lowest: "#060B0D",
          low: "#0C1317",
          DEFAULT: "#1D2529",
          high: "#212A2F",
          higher: "#273035",
          highest: "#393F43"
        },
        "on-surface": {
          low: "#7E8A8F",
          DEFAULT: "#CFDEE5",
          high:"#DDDDDD",
        },
        "on-primary": {
          DEFAULT: "#1D2529",
        },
        primary: {
          low: "#FFA000",
          DEFAULT: "#FBBE00",
          high: "#FFD54F",
        },
        success: {
          low: "#0A7F00",
          DEFAULT: "#0C9600",
          high: "#0EB000"
        },
        error: {
          low: "#A30000",
          DEFAULT: "#F30707",
          high: "#FF4C4C"
        },
      }
    })
  ],
}

