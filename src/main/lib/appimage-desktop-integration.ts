import { constants } from "fs";
import { access, copyFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, isAbsolute, join, resolve } from "path";
import { LogLevel, uberLog } from "./logger";

// An AppImage installs nothing, so nothing on disk describes the app. Desktop
// environments resolve a window's icon by matching its app_id against a
// .desktop entry in the XDG data directories, and on Wayland that is the only
// mechanism available: the protocol has no way for a client to set its own
// window icon, so BrowserWindow.setIcon is a no-op there. Without an entry the
// app shows a generic placeholder icon.
//
// Copy the .desktop file and icons that ship inside the image into the user's
// own XDG directories on first run, rewriting Exec to point at the AppImage.
// The .deb does this through dpkg; this is the AppImage equivalent.

const DESKTOP_FILE_NAME = "ultra-tracker.desktop";
const ICON_RELATIVE_ROOT = join("usr", "share", "icons", "hicolor");

/**
 * Absolute path of the running AppImage, or null when not running as one.
 *
 * The legacy FUSE2 runtime set APPIMAGE directly. The static type2 runtime we
 * build with does not always, but it does set ARGV0 (the path used to invoke
 * the image) and OWD (the directory it was invoked from), which together
 * reconstruct the same thing.
 */
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

/** Root of the mounted AppImage contents, or null when not running as one. */
function resolveAppDir(): string | null {
  const appDir = process.env.APPDIR;
  if (appDir) return appDir;

  // Fall back to the directory holding the executable, which is the mount root
  // for an AppImage. Only trust it when it looks like one.
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

/** Point Exec and TryExec at the AppImage rather than the temporary mount. */
function rewriteDesktopEntry(source: string, appImagePath: string): string {
  const quoted = appImagePath.includes(" ") ? `"${appImagePath}"` : appImagePath;
  return source
    .split("\n")
    .map((line) => {
      if (line.startsWith("Exec=")) {
        // Preserve the field codes and flags the packaged entry already carries
        // (--no-sandbox, %U), replacing only the AppRun placeholder.
        const args = line.slice("Exec=".length).trim().split(/\s+/).slice(1);
        return `Exec=${[quoted, ...args].join(" ")}`;
      }
      if (line.startsWith("TryExec=")) return `TryExec=${quoted}`;
      return line;
    })
    .join("\n");
}

async function copyIcons(appDir: string, iconTargetRoot: string): Promise<number> {
  const iconSourceRoot = join(appDir, ICON_RELATIVE_ROOT);
  if (!(await exists(iconSourceRoot))) return 0;

  let copied = 0;
  for (const sizeDir of await readdir(iconSourceRoot)) {
    const sourceDir = join(iconSourceRoot, sizeDir, "apps");
    if (!(await exists(sourceDir))) continue;

    const targetDir = join(iconTargetRoot, sizeDir, "apps");
    await mkdir(targetDir, { recursive: true });
    for (const iconFile of await readdir(sourceDir)) {
      await copyFile(join(sourceDir, iconFile), join(targetDir, iconFile));
      copied += 1;
    }
  }
  return copied;
}

/**
 * Install the AppImage's desktop entry and icons into the user's XDG
 * directories so desktop environments can associate the running window with
 * its icon.
 *
 * Safe to call unconditionally: it returns immediately unless running as an
 * AppImage on Linux, and it never throws or blocks startup. Re-runs on every
 * launch so the entry keeps pointing at the image after it is moved or renamed.
 */
export async function integrateAppImageDesktopEntry(): Promise<void> {
  if (process.platform !== "linux") return;

  const appDir = resolveAppDir();
  if (appDir == null) return;

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

    // Avoid rewriting an identical file so we do not touch its mtime and
    // trigger desktop database rescans on every launch.
    const current = await readFile(targetDesktopEntry, "utf8").catch(() => null);
    if (current === entry) return;

    await writeFile(targetDesktopEntry, entry, { mode: 0o644 });
    const icons = await copyIcons(appDir, join(dataHome, "icons", "hicolor"));

    uberLog(
      LogLevel.info,
      "startup",
      `Installed AppImage desktop entry at ${targetDesktopEntry} with ${icons} icon(s)`,
      false
    );
  } catch (error) {
    // Desktop integration is cosmetic; never let it stop the app starting.
    uberLog(
      LogLevel.warn,
      "startup",
      `AppImage desktop integration failed: ${(error as Error).message}`,
      false
    );
  }
}
