const { resolve } = require("path");
const react = require("@vitejs/plugin-react");
const { defineConfig, externalizeDepsPlugin } = require("electron-vite");
const { TanStackRouterVite } = require("@tanstack/router-vite-plugin");

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
    plugins: [
      react(),
      TanStackRouterVite({
        routesDirectory: resolve(__dirname, "src/renderer/src/routes"),
        generatedRouteTree: resolve(__dirname, "src/renderer/src/routeTree.gen.ts")
      })
    ]
  }
});
