import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  main: {
    resolve: {
      alias: {
        $resources: resolve("resources"),
        $renderer: resolve("src/renderer/src"),
        $preload: resolve("src/preload/src"),
        $shared: resolve("src/shared")
      }
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    resolve: {
      alias: {
        $resources: resolve("resources"),
        $renderer: resolve("src/renderer/src")
      }
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    publicDir: resolve("src/renderer/public"),
    resolve: {
      alias: {
        "~": resolve("src/renderer/src"),
        $shared: resolve("src/shared")
      }
    },
    plugins: [
      react(),
      svgr(),
      TanStackRouterVite({
        routesDirectory: resolve("src/renderer/src/routes"),
        generatedRouteTree: resolve("src/renderer/src/routeTree.gen.ts")
      })
    ]
  }
});
