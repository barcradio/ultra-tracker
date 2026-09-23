import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import svgr from "vite-plugin-svgr";
import sharedConfig from "./electron.vite.shared.cjs";

export default defineConfig({
  main: {
    ...sharedConfig.main,
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    ...sharedConfig.preload,
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    ...sharedConfig.renderer,
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
