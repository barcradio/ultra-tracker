import { execFile } from "child_process";
import { constants } from "fs";
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, isAbsolute, join, resolve } from "path";
import { promisify } from "util";
import { LogLevel, uberLog } from "./logger";

const run = promisify(execFile);

// An AppImage installs nothing, so nothing matches the window to a .desktop entry - and on
// Wayland that entry is the only way a window gets an icon. This does for it what dpkg does
// for the .deb.

const DESKTOP_FILE_NAME = "ultra-tracker.desktop";
const ICON_RELATIVE_ROOT = join("usr", "share", "icons", "hicolor");

// The static runtime does not always set APPIMAGE, but ARGV0 and OWD together reconstruct it.
function resolveAppImagePath(): string | null {
  const direct = process.env.APPIMAGE;
  if (direct && isAbsolute(direct)) return direct;

  const argv0 = process.env.ARGV0;
  if (!argv0) return null;
  if (isAbsolute(argv0)) return argv0;

  const originalWorkingDir = process.env.OWD;
  if (!originalWorkingDir) return null;
  return resolve(originalWorkingDir, argv0);
}

function resolveAppDir(): string | null {
  const appDir = process.env.APPDIR;
  if (appDir) return appDir;

  const candidate = dirname(process.execPath);
  return candidate.includes("/.mount_") ? candidate : null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Point Exec and TryExec at the AppImage rather than the temporary mount.
function rewriteDesktopEntry(source: string, appImagePath: string): string {
  const quoted = appImagePath.includes(" ") ? `"${appImagePath}"` : appImagePath;
  return source
    .split("\n")
    .map((line) => {
      if (line.startsWith("Exec=")) {
        const args = line.slice("Exec=".length).trim().split(/\s+/).slice(1);
        return `Exec=${[quoted, ...args].join(" ")}`;
      }
      if (line.startsWith("TryExec=")) return `TryExec=${quoted}`;
      return line;
    })
    .join("\n");
}

// Qt ignores a hicolor directory with no index.theme, so LXQt and KDE find no icons without
// one; GTK works either way.
async function writeIconThemeIndex(iconRoot: string, sizeDirs: string[]): Promise<void> {
  const indexPath = join(iconRoot, "index.theme");
  if (sizeDirs.length === 0 || (await exists(indexPath))) return;

  const directories = sizeDirs.map((size) => `${size}/apps`);
  const sections = sizeDirs.map((size) =>
    [
      `[${size}/apps]`,
      `Size=${size.split("x")[0]}`,
      "Context=Applications",
      "Type=Threshold",
      ""
    ].join("\n")
  );

  const index = [
    "[Icon Theme]",
    "Name=Hicolor",
    "Comment=Fallback icon theme",
    `Directories=${directories.join(",")}`,
    "",
    ...sections
  ].join("\n");

  await writeFile(indexPath, index, { mode: 0o644 });
}

async function copyIcons(appDir: string, iconTargetRoot: string): Promise<number> {
  const iconSourceRoot = join(appDir, ICON_RELATIVE_ROOT);
  if (!(await exists(iconSourceRoot))) return 0;

  let copied = 0;
  const populatedSizes: string[] = [];
  for (const sizeDir of await readdir(iconSourceRoot)) {
    const sourceDir = join(iconSourceRoot, sizeDir, "apps");
    if (!(await exists(sourceDir))) continue;

    const targetDir = join(iconTargetRoot, sizeDir, "apps");
    await mkdir(targetDir, { recursive: true });
    for (const iconFile of await readdir(sourceDir)) {
      await copyFile(join(sourceDir, iconFile), join(targetDir, iconFile));
      copied += 1;
    }
    populatedSizes.push(sizeDir);
  }

  await writeIconThemeIndex(iconTargetRoot, populatedSizes);
  return copied;
}

// Deliberately not awaited: menus are read long after startup and both tools are often absent.
function refreshDesktopCaches(applicationsDir: string, iconRoot: string): void {
  void Promise.allSettled([
    run("update-desktop-database", [applicationsDir], { timeout: 5_000 }),
    run("gtk-update-icon-cache", ["--quiet", "--force", "--ignore-theme-index", iconRoot], {
      timeout: 5_000
    })
  ]);
}

// Both entries share a basename and the user-level one wins, so a leftover AppImage entry
// keeps shadowing an installed package.
async function removeSupersededEntry(): Promise<void> {
  try {
    const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
    const userEntry = join(dataHome, "applications", DESKTOP_FILE_NAME);

    const contents = await readFile(userEntry, "utf8").catch(() => null);
    if (contents == null || !contents.includes("X-AppImage-Version")) return;
    if (!(await exists(join("/usr/share/applications", DESKTOP_FILE_NAME)))) return;

    await rm(userEntry, { force: true });
    const iconRoot = join(dataHome, "icons", "hicolor");
    for (const sizeDir of await readdir(iconRoot).catch(() => [])) {
      await rm(join(iconRoot, sizeDir, "apps", "ultra-tracker.png"), { force: true }).catch(
        () => undefined
      );
    }

    refreshDesktopCaches(join(dataHome, "applications"), iconRoot);

    uberLog(
      LogLevel.info,
      "startup",
      "Removed the AppImage desktop entry now that an installed package provides one",
      false
    );
  } catch {
    // Cosmetic; never let it affect startup.
  }
}

// Safe to call unconditionally: a no-op unless running as an AppImage on Linux, and it never
// throws. Re-runs each launch so the entry follows a moved image.
export async function integrateAppImageDesktopEntry(): Promise<void> {
  if (process.platform !== "linux") return;

  const appDir = resolveAppDir();
  if (appDir == null) {
    await removeSupersededEntry();
    return;
  }

  const appImagePath = resolveAppImagePath();
  if (appImagePath == null) {
    uberLog(
      LogLevel.warn,
      "startup",
      "Running as an AppImage but its path could not be determined; skipping desktop integration",
      false
    );
    return;
  }

  try {
    const sourceDesktopEntry = join(appDir, DESKTOP_FILE_NAME);
    if (!(await exists(sourceDesktopEntry))) return;

    const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
    const applicationsDir = join(dataHome, "applications");
    await mkdir(applicationsDir, { recursive: true });

    const entry = rewriteDesktopEntry(await readFile(sourceDesktopEntry, "utf8"), appImagePath);
    const targetDesktopEntry = join(applicationsDir, DESKTOP_FILE_NAME);

    const current = await readFile(targetDesktopEntry, "utf8").catch(() => null);
    if (current === entry) return;

    await writeFile(targetDesktopEntry, entry, { mode: 0o644 });
    const iconRoot = join(dataHome, "icons", "hicolor");
    const icons = await copyIcons(appDir, iconRoot);
    refreshDesktopCaches(applicationsDir, iconRoot);

    uberLog(
      LogLevel.info,
      "startup",
      `Installed AppImage desktop entry at ${targetDesktopEntry} with ${icons} icon(s)`,
      false
    );
  } catch (error) {
    uberLog(
      LogLevel.warn,
      "startup",
      `AppImage desktop integration failed: ${(error as Error).message}`,
      false
    );
  }
}
