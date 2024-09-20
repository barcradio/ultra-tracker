const { createThemes } = require('tw-colors')


/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{ts,tsx}",
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
      width: {
        "104": "26rem",
        "112": "28rem",
        "120": "30rem",
        "128": "32rem",
        "144": "36rem",
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
    require("tailwindcss-animate"),
    createThemes({
      light: {
        surface: {
          DEFAULT: "#CFCFCF",
          secondary: "#AAB0B3",
          tertiary: "#CBD3D6"
        },
        component: {
          DEFAULT: "#EAEAEA",
          secondary: "#E3E4E5",
          strong: "#AAB0B3",
          hover: "#CDD0D1"
        },
        on: {
          surface: {
            DEFAULT:"#1D2529",
            hover: "#060B0D"
          },
          primary: "#CDD0D1",
          success: "#1D2529",
          danger: "#1D2529",
        },
        primary: {
          DEFAULT: "#0871A6",
          hover: "#0E8FCC",
        },
        success: {
          DEFAULT: "#0EAA00",
          hover: "#0A7F00",
        },
        warning: {
          DEFAULT: "#F75C14",
          hover: "#D44A0B"
        },
        danger: {
          DEFAULT: "#F30707",
          hover: "#A30000",
        },
      },
      dark: {
        surface: {
          DEFAULT: "#1D2529",
          secondary: "#060B0D",
          tertiary: "#0D1519"
        },
        component: {
          DEFAULT: "#1D2529",
          secondary: "#222A2E",
          strong: "#283034",
          hover: "#393F43"
        },
        on: {
          surface: {
            DEFAULT: "#7E8A8F",
            hover: "#CFDEE5",
            strong: "#CFDEE5",
          },
          component: {
            DEFAULT:"#CDD0D1",
            hover: "#AAB0B3",
            strong: "#AAB0B3",
          },
          primary: "#1D2529",
          success: "#1D2529",
          danger: "#1D2529",
        },
        primary: {
          hover: "#FFA000",
          DEFAULT: "#FBBE00",
        },
        success: {
          DEFAULT: "#0EAA00",
          hover: "#0A7F00",
        },
        warning: {
          DEFAULT: "#F75C14",
          hover: "#D44A0B"
        },
        danger: {
          DEFAULT: "#F30707",
          hover: "#A30000",
        },
      },
    }, {
      strict: true
    })
  ],
}

