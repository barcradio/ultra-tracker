const isCore = require("is-core-module");
const resolve = require("resolve");
const { execSync } = require("child_process");
const path = require("path");

/**
 * @typedef ResolverOptions
 * @type {Object}
 * @property {string} viteConfigPath - The path to the Vite configuration file.
 * @property {boolean} [debug] - Whether to enable logging.
 */

/**
 * Handle the replacement of path parts with configured aliases.
 * @param {Object | Object[]} alias - The alias configuration.
 * @param {string} source - The source path to process.
 * @returns {string} The processed source.
 */
const processAlias = (alias, source) => {
  if (alias) {
    const pathParts = path.normalize(source).split(path.sep);
    if (Array.isArray(alias)) {
      for (let i = 0; i < pathParts.length; i++) {
        alias.forEach(({ find, replacement }) => {
          if (pathParts[i] === find) {
            pathParts[i] = replacement;
          }
        });
      }
    } else if (typeof alias === "object") {
      for (let i = 0; i < pathParts.length; i++) {
        if (Object.prototype.hasOwnProperty.call(alias, pathParts[i])) {
          pathParts[i] = alias[pathParts[i]];
        }
      }
    } else {
      throw new Error("The alias must be either an object, or an array of objects.");
    }
    return pathParts.join(path.sep);
  }
  return source;
};

/**
 * Check if the child path is a descendent of the parent path.
 * @returns {boolean}
 */
const isParent = (parentPath, childPath) => {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

/**
 * Paths to Electron modules, keyed by module type.
 */
const ELECTRON_MODULE_PATHS = {
  main: path.resolve(__dirname, "src/main"),
  preload: path.resolve(__dirname, "src/preload"),
  renderer: path.resolve(__dirname, "src/renderer")
};

/**
 * Finds the Vite configuration module that corresponds to the given file.
 * @param {string} file - The file path to find the Vite configuration module for.
 * @param {Object} viteConfig - The full Vite configuration object.
 * @returns {Object | null} The Vite configuration module, or null if the file does not correspond to any module type.
 */
const getViteConfigModule = (file, viteConfig) => {
  if (isParent(ELECTRON_MODULE_PATHS.main, file)) {
    return viteConfig.main;
  } else if (isParent(ELECTRON_MODULE_PATHS.preload, file)) {
    return viteConfig.preload;
  } else if (isParent(ELECTRON_MODULE_PATHS.renderer, file)) {
    return viteConfig.renderer;
  }
  return null;
};

/**
 * Parses the Vite configuration file for necessary resolver information.
 * @param {string} file - The file path to find the Vite configuration module for.
 * @param {Object} viteConfig - The full Vite configuration object.
 */
const parseViteConfig = (file, viteConfig, log) => {
  const viteModule = getViteConfigModule(file, viteConfig);

  const defaultExtensions = [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"];
  const basedir = path.dirname(file);

  if (viteModule === null) {
    return { alias: {}, resolveOptions: { extensions: defaultExtensions, basedir } };
  }

  const { alias, extensions = defaultExtensions } = viteModule.resolve ?? {};
  const resolveOptions = { basedir: path.dirname(file), extensions };

  return { alias, resolveOptions, viteModule };
};

/**
 * Create a logging function.
 * @param {ResolverOptions} options - The options object for the resolver.
 */
const logFactory = (options) => {
  const MIN_LABEL_LENGTH = 35;

  if (!options.debug) return () => {};
  return (label, message) => {
    let str = `${label}: `;
    if (str.length < MIN_LABEL_LENGTH) str += " ".repeat(MIN_LABEL_LENGTH - str.length);
    execSync(`echo $'${str}${message}'`, { stdio: "inherit" });
  };
};

/**
 * Resolve the given source path.
 * @param {string} source - The source path to resolve.
 * @param {string} file - The file path that is importing the source.
 * @param {ResolverOptions} options - The options object for the resolver.
 */
const resolvePath = (source, file, options) => {
  const log = logFactory(options);

  const resolveSync = (source, resolveOptions, label) => {
    log(`RESOLVING ${label}`, source);
    const resolvedPath = resolve.sync(source, resolveOptions);
    log(`RESOLVED`, resolvedPath);
    return { found: true, path: resolvedPath };
  };

  log("\nIN FILE", ` ${file}`);

  if (isCore(source)) {
    log("RESOLVED", source);
    return { found: true, path: null };
  }

  if (!options.viteConfigPath) throw new Error("viteConfigPath is required");

  const viteConfig = require(options.viteConfigPath);
  const { alias, resolveOptions, viteModule } = parseViteConfig(file, viteConfig, log);

  // Remove Vite static asset mark
  source = source.replace(/\?.*$/, "");

  // try to resolve the source as is
  try {
    return resolveSync(source, resolveOptions, "AS IS");
  } catch (err) {
    log("COULD NOT RESOLVE AS IS", source);
  }

  // try to resolve the source with alias
  const parsedSource = processAlias(alias, source);
  if (parsedSource !== source) {
    try {
      return resolveSync(parsedSource, resolveOptions, "WITH ALIAS");
    } catch (err) {
      log("COULD NOT RESOVE WITH ALIAS", source);
    }
  }

  // try to resolve the source if it is an absolute path
  if (path.isAbsolute(parsedSource)) {
    const root = viteModule.root ?? path.resolve(__dirname);
    const absoluteSource = path.join(path.resolve(root), parsedSource);
    try {
      return resolveSync(absoluteSource, resolveOptions, "AS ABSOLUTE PATH");
    } catch (err) {
      log("COULD NOT RESOLVE AS ABSOLUTE PATH", source);
    }
  }

  // try to resolve the source in public resources directory if all above failed
  if (viteModule.publicDir !== false) {
    const publicDir = viteModule.publicDir ?? "resources";
    const publicSource = path.join(path.resolve(publicDir), parsedSource);
    try {
      return resolveSync(publicSource, resolveOptions, "IN PUBLIC DIRECTORY");
    } catch (err) {
      log("COULD NOT RESOLVE IN PUBLIC DIR", source);
    }
  }

  log("ERROR: UNABLE TO RESOLVE");
  return { found: false };
};

// Export

exports.interfaceVersion = 2;
exports.resolve = resolvePath;
