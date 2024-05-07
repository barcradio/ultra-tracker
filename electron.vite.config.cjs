const react = require("@vitejs/plugin-react");
const { defineConfig, externalizeDepsPlugin } = require("electron-vite");
const { resolve } = require("path");

module.exports = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        $resources: resolve(__dirname, "resources"),
        $renderer: resolve(__dirname, "src/renderer/src")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        $resources: resolve("./resources"),
        $renderer: resolve(__dirname, "src/renderer/src")
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "~": resolve(__dirname, "src/renderer/src")
      }
    },
    plugins: [react()]
  }
});
