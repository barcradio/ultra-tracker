import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/main/**/*.ts"],
      exclude: ["src/main/**/tests/**"]
    }
  },
  resolve: {
    alias: {
      $shared: path.resolve(__dirname, "src/shared"),
      $preload: path.resolve(__dirname, "src/preload"),
      $renderer: path.resolve(__dirname, "src/renderer/src"),
      $api: path.resolve(__dirname, "src/main/api"),
      $resources: path.resolve(__dirname, "resources")
    }
  }
});
