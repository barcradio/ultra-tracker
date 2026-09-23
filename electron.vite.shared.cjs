const { resolve } = require("node:path");

module.exports = {
  main: {
    resolve: {
      alias: {
        $resources: resolve("resources"),
        $renderer: resolve("src/renderer/src"),
        $preload: resolve("src/preload/src"),
        $shared: resolve("src/shared")
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        $resources: resolve("resources"),
        $renderer: resolve("src/renderer/src")
      }
    }
  },
  renderer: {
    publicDir: resolve("src/renderer/public"),
    resolve: {
      alias: {
        "~": resolve("src/renderer/src"),
        $shared: resolve("src/shared")
      }
    }
  }
};
