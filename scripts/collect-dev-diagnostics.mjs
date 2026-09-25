import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  statfsSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const argumentsByName = new Map();
const homePathPattern = new RegExp(
  os
    .homedir()
    .split(/[\\/]/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\\\/]"),
  "gi"
);

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument.startsWith("--")) {
    argumentsByName.set(
      argument.slice(2),
      process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index]
    );
  }
}

if (argumentsByName.has("help")) {
  console.log("Usage: node scripts/collect-dev-diagnostics.mjs [--phase NAME] [--run-id ID]");
  process.exit(0);
}

const capturedAt = new Date().toISOString();
const phase = String(argumentsByName.get("phase") || "manual").replace(/[^a-zA-Z0-9_.-]/g, "-");
const runId = String(argumentsByName.get("run-id") || capturedAt.replace(/[:.]/g, "-")).replace(
  /[^a-zA-Z0-9_.-]/g,
  "-"
);

function run(command, args = []) {
  const executable =
    process.platform === "win32" && ["corepack", "npm", "npx", "pnpm"].includes(command)
      ? `${command}.cmd`
      : command;
  const result = spawnSync(executable, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: executable.endsWith(".cmd"),
    timeout: 15_000,
    windowsHide: true
  });

  return {
    command: [command, ...args].join(" "),
    status: result.status,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
    error: result.error?.message || null
  };
}

function commandLocations(command) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = run(locator, [command]);
  return result.status === 0 ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function hashFile(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) return null;

  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

function canWrite(directory) {
  try {
    accessSync(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function getDisk() {
  try {
    const stats = statfsSync(repositoryRoot);
    return {
      availableBytes: stats.bavail * stats.bsize,
      totalBytes: stats.blocks * stats.bsize
    };
  } catch (error) {
    return { error: error.message };
  }
}

function getElectronState() {
  const packageDirectory = path.join(repositoryRoot, "node_modules", "electron");
  const packageJson = readJson("node_modules/electron/package.json");
  const pathFile = path.join(packageDirectory, "path.txt");
  const executablePath = existsSync(pathFile)
    ? path.join(packageDirectory, "dist", readFileSync(pathFile, "utf8").trim())
    : null;

  return {
    packageVersion: packageJson?.version || null,
    packageEngine: packageJson?.engines?.node || null,
    pathFile: existsSync(pathFile) ? readFileSync(pathFile, "utf8").trim() : null,
    executableExists: executablePath ? existsSync(executablePath) : false
  };
}

function sanitizeReportValue(_key, value) {
  if (typeof value !== "string") return value;
  return value.replace(homePathPattern, "<home>");
}

function sanitizeUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return "<set>";
  }
}

const packageJson = readJson("package.json");
const configKeys = [
  "registry",
  "store-dir",
  "virtual-store-dir",
  "node-linker",
  "shamefully-hoist",
  "ignore-scripts",
  "electron-mirror",
  "electron-builder-binaries-mirror"
];
const pnpmConfig = Object.fromEntries(
  configKeys.map((key) => {
    const result = run("pnpm", ["config", "get", key]);
    if (result.status !== 0) return [key, { error: result.error || result.stderr }];
    if (!result.stdout || result.stdout === "undefined") return [key, null];
    return [key, key.includes("mirror") ? sanitizeUrl(result.stdout) : result.stdout];
  })
);
const proxyVariables = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"].reduce((values, name) => {
  values[name] = Boolean(process.env[name] || process.env[name.toLowerCase()]);
  return values;
}, {});

const report = {
  schemaVersion: 2,
  capturedAt,
  runId,
  phase,
  system: {
    platform: process.platform,
    architecture: process.arch,
    osType: os.type(),
    osRelease: os.release(),
    osVersion: os.version(),
    cpuModel: os.cpus()[0]?.model || null,
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    disk: getDisk()
  },
  runtime: {
    nodeVersion: process.version,
    nodeExecutable: process.execPath,
    nodeModulesAbi: process.versions.modules,
    packageManager: packageJson?.packageManager || null,
    requiredNode: packageJson?.devEngines?.runtime || packageJson?.engines?.node || null,
    commands: {
      node: run("node", ["--version"]),
      pnpm: run("pnpm", ["--version"]),
      git: run("git", ["--version"]),
      corepack: run("corepack", ["--version"]),
      nvm: run("nvm", ["version"]),
      nvmVersions: run("nvm", ["list"])
    },
    locations: {
      node: commandLocations("node"),
      pnpm: commandLocations("pnpm"),
      git: commandLocations("git"),
      nvm: commandLocations("nvm")
    }
  },
  configuration: {
    pnpm: pnpmConfig,
    electronMirror: sanitizeUrl(process.env.ELECTRON_MIRROR),
    electronBuilderBinariesMirror: sanitizeUrl(process.env.ELECTRON_BUILDER_BINARIES_MIRROR),
    nodeOptions: process.env.NODE_OPTIONS || null,
    pnpmHome: process.env.PNPM_HOME || null,
    pathEntries: (process.env.PATH || "").split(path.delimiter).filter(Boolean),
    proxyVariablesSet: proxyVariables
  },
  repository: {
    root: repositoryRoot,
    writable: canWrite(repositoryRoot),
    gitCommit: run("git", ["rev-parse", "HEAD"]),
    gitStatus: run("git", ["status", "--short"]),
    fileHashes: Object.fromEntries(
      ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", ".nvmrc"].map((file) => [
        file,
        hashFile(file)
      ])
    )
  },
  dependencies: {
    nodeModulesExists: existsSync(path.join(repositoryRoot, "node_modules")),
    electron: getElectronState(),
    betterSqlite3: {
      packageVersion: readJson("node_modules/better-sqlite3/package.json")?.version || null,
      releaseBindingExists: existsSync(
        path.join(
          repositoryRoot,
          "node_modules",
          "better-sqlite3",
          "build",
          "Release",
          "better_sqlite3.node"
        )
      ),
      platformPrebuildExists: existsSync(
        path.join(
          repositoryRoot,
          "node_modules",
          "better-sqlite3",
          "prebuilds",
          `${process.platform}-${process.arch}.node`
        )
      )
    }
  }
};

const expectedNodeVersion = packageJson?.devEngines?.runtime?.version;
const expectedPnpmVersion = packageJson?.packageManager?.match(/^pnpm@(.+)$/)?.[1];
const recommendedActions = [];

if (expectedNodeVersion && process.version.replace(/^v/, "") !== expectedNodeVersion) {
  recommendedActions.push({
    id: "align-node",
    reason: `Node ${process.version.replace(/^v/, "")} does not match ${expectedNodeVersion}`
  });
}

if (
  process.platform === "win32" &&
  report.runtime.locations.nvm.length > 0 &&
  !report.runtime.locations.node[0]?.toLowerCase().includes(".shim")
) {
  recommendedActions.push({
    id: "normalize-windows-path",
    reason: "The active Node executable does not resolve through the NVM shim"
  });
}

if (report.runtime.commands.pnpm.status !== 0) {
  const pnpmFailure = `${report.runtime.commands.pnpm.stdout}\n${report.runtime.commands.pnpm.stderr}`;
  recommendedActions.push({
    id: /ERR_PNPM_NO_MATCHING_VERSION|@pnpm\/win-x64/.test(pnpmFailure)
      ? "repair-pnpm"
      : "align-pnpm",
    reason: "pnpm is not executable"
  });
} else if (expectedPnpmVersion && report.runtime.commands.pnpm.stdout !== expectedPnpmVersion) {
  recommendedActions.push({
    id: "align-pnpm",
    reason: `pnpm ${report.runtime.commands.pnpm.stdout} does not match ${expectedPnpmVersion}`
  });
}

const dependenciesNeedHydration =
  !report.dependencies.nodeModulesExists ||
  !report.dependencies.electron.executableExists ||
  (!report.dependencies.betterSqlite3.releaseBindingExists &&
    !report.dependencies.betterSqlite3.platformPrebuildExists);

recommendedActions.push({
  id: dependenciesNeedHydration ? "hydrate-dependencies" : "verify-dependencies",
  reason: dependenciesNeedHydration
    ? "Required dependency artifacts are missing"
    : "Installed dependency artifacts are present"
});

report.recommendedActions = recommendedActions;

const outputDirectory = path.join(repositoryRoot, "reports", "hydration");
const outputPath = path.join(outputDirectory, `${runId}-${phase}.json`);
const actionPath = path.join(outputDirectory, `${runId}-actions.txt`);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, sanitizeReportValue, 2)}\n`);
writeFileSync(actionPath, `${recommendedActions.map(({ id }) => id).join("\n")}\n`);

console.log(`Hydration diagnostics written to ${path.relative(repositoryRoot, outputPath)}`);
console.log(`Hydration actions written to ${path.relative(repositoryRoot, actionPath)}`);
