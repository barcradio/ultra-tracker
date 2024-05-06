const react = require("@vitejs/plugin-react");
const { defineConfig, externalizeDepsPlugin } = require("electron-vite");
const { resolve } = require("path");

module.exports = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        $resources: resolve("./resources")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        $renderer: resolve(__dirname, "src/renderer/src"),
        $components: resolve(__dirname, "src/renderer/src/components")
      }
    },
    plugins: [react()]
  }
});
