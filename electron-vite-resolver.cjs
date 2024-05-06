const isCore = require("is-core-module");
const resolve = require("resolve");
const { execSync } = require("child_process");
const path = require("path");

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

const isParent = (parentPath, childPath) => {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

const ELECTRON_MODULE_PATHS = {
  main: path.resolve(__dirname, "src/main"),
  preload: path.resolve(__dirname, "src/preload"),
  renderer: path.resolve(__dirname, "src/renderer")
};

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

const logFactory = (options) => {
  if (!options.debug) {
    return () => {};
  }

  return (...messages) => {
    execSync(`echo ${messages.join(" ")}`, {
      stdio: "inherit"
    });
  };
};

const resolvePath = (source, file, options) => {
  const log = logFactory(options);

  const resolveSync = (source, resolveOptions, label) => {
    log("resolving: ", ` ${label} `, source);
    const resolvedPath = resolve.sync(source, resolveOptions);
    log("resolved: ", resolvedPath);
    return { found: true, path: resolvedPath };
  };

  log("in file: ", file);

  if (isCore(source)) {
    log("resolved: ", source);
    return { found: true, path: null };
  }

  if (!options.viteConfigPath) {
    throw new Error("viteConfigPath is required");
  }

  const fullViteConfig = require(options.viteConfigPath);

  const viteConfig = getViteConfigModule(file, fullViteConfig);

  const defaultExtensions = [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"];
  const { alias, extensions = defaultExtensions } = viteConfig.resolve ?? {};
  const resolveOptions = { basedir: path.dirname(file), extensions };

  // Remove Vite static asset mark
  source = source.replace(/\?.*$/, "");

  // try to resolve the source as is
  try {
    return resolveSync(source, resolveOptions, "as is");
  } catch (err) {
    log(err);
  }

  // try to resolve the source with alias
  const parsedSource = processAlias(alias, source);
  if (parsedSource !== source) {
    try {
      return resolveSync(parsedSource, resolveOptions, "with alias");
    } catch (err) {
      log(err);
    }
  }

  // try to resolve the source if it is an absolute path
  if (path.isAbsolute(parsedSource)) {
    const root = viteConfig.root ?? process.cwd();
    const absoluteSource = path.join(path.resolve(root), parsedSource);
    try {
      return resolveSync(absoluteSource, resolveOptions, "absolute path");
    } catch (err) {
      log(err);
    }
  }

  // try to resolve the source in public directory if all above failed
  if (viteConfig.publicDir !== false) {
    const publicDir = viteConfig.publicDir ?? "public";
    const publicSource = path.join(path.resolve(publicDir), parsedSource);
    try {
      return resolveSync(publicSource, resolveOptions, "in public directory");
    } catch (err) {
      log(err);
    }
  }

  log("ERROR: ", "Unable to resolve");
  return { found: false };
};

exports.interfaceVersion = 2;
exports.resolve = resolvePath;
