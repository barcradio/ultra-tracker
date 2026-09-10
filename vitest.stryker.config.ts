import path from "path";
import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts: Stryker's active-mutant global must be visible to the test
// process, which requires a single non-threaded worker instead of Vitest's default thread pool.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
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
