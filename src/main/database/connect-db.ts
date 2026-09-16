import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { app } from "electron";
import { formatEventDatabaseName } from "$shared/formatters";
import { CreateTables, applyMigrations } from "./tables-db";
import { appStore } from "../lib/store";

let db: Database.Database | null = null;
let backupInterval: NodeJS.Timeout | null = null;
const defaultOpenSplitTime = { production: { name: "", id: 0 }, staging: { name: "", id: 0 } };

// The app wires these at startup. Handlers rather than a direct import because the database
// layer cannot depend on anything that reads from it without creating an import cycle.
let eventOpened: (() => void) | null = null;
let eventClosed: (() => void) | null = null;

export function setEventLifecycleHandlers(opened: () => void, closed: () => void): void {
  let isOpen = false;
  eventOpened = () => {
    opened();
    isOpen = true;
  };
  eventClosed = () => {
    if (!isOpen) return;
    isOpen = false;
    closed();
  };
}

function getDbFolder(): string {
  return path.join(app.getPath("userData"), `event-databases`);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDbPaths(slug: string) {
  const dbFolder = getDbFolder();
  return {
    dbFolder,
    dbPath: path.join(dbFolder, `${slug}.db`),
    dbBackupPath: path.join(dbFolder, `${slug}-backup.db`)
  };
}

function startBackupLoop(dbBackupPath: string): void {
  if (backupInterval) clearInterval(backupInterval);

  backupInterval = setInterval(() => {
    if (!db) return;

    console.log("starting backup...");
    console.log(`backup location: ${dbBackupPath}`);
    db.backup(dbBackupPath)
      .then(() => {
        console.log("backup complete");
      })
      .catch((err) => {
        console.log("backup failed:", err);
      });
  }, 300000);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpenSplitTimeEnvironment(value: unknown): value is { name: string; id: number } {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    typeof value.id === "number" &&
    Number.isFinite(value.id)
  );
}

function isOpenSplitTimeMetadata(value: unknown): value is {
  production: { name: string; id: number };
  staging: { name: string; id: number };
} {
  return (
    isObject(value) &&
    isOpenSplitTimeEnvironment(value.production) &&
    isOpenSplitTimeEnvironment(value.staging)
  );
}

function openDatabaseConnection(slug: string): void {
  const { dbPath, dbBackupPath } = getDbPaths(slug);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  startBackupLoop(dbBackupPath);
  applyMigrations(db);
  const eventMeta = db
    .prepare(
      `SELECT name, startline, finishline, starttime, endtime, openSplitTime FROM EventMeta LIMIT 1`
    )
    .get() as
    | {
        name: string | null;
        startline: string | null;
        finishline: string | null;
        starttime: string | null;
        endtime: string | null;
        openSplitTime: string | null;
      }
    | undefined;
  appStore.set("event.name", eventMeta?.name || slug);
  appStore.set("event.prettyName", formatEventDatabaseName(slug, eventMeta?.name || undefined));
  appStore.set("event.activeDatabaseSlug", slug);
  appStore.set("event.startline", eventMeta?.startline ?? "");
  appStore.set("event.finishline", eventMeta?.finishline ?? "");
  appStore.set("event.starttime", eventMeta?.starttime ?? "");
  appStore.set("event.endtime", eventMeta?.endtime ?? "");

  let openSplitTime = defaultOpenSplitTime;
  if (eventMeta?.openSplitTime) {
    try {
      const parsed = JSON.parse(eventMeta.openSplitTime) as unknown;
      if (isOpenSplitTimeMetadata(parsed)) {
        openSplitTime = parsed;
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.log(`Unable to parse EventMeta.openSplitTime: ${e.message}`);
      }
    }
  }
  appStore.set("event.openSplitTime", openSplitTime);

  eventOpened?.();
  console.log("Connected to SQLite Database:" + dbPath);
}

export function closeDatabaseConnection(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }

  eventClosed?.();

  db?.close();
  db = null;
}

export function switchToDatabase(slug: string): void {
  const { dbFolder } = getDbPaths(slug);

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

  closeDatabaseConnection();

  try {
    openDatabaseConnection(slug);
  } catch (e: unknown) {
    closeDatabaseConnection();
    if (e instanceof Error) {
      console.log(`Unable to connect or create database: ${e.message}`);
    }
  }

  if (db) console.log(`pragma user_version: ${db.pragma("user_version", { simple: true })}`);
}

export function createDatabaseFile(slug: string): void {
  const { dbFolder, dbPath } = getDbPaths(slug);

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

  closeDatabaseConnection();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  CreateTables(db);
  db.pragma("user_version = 4");
  closeDatabaseConnection();
  switchToDatabase(slug);
}

export function deleteDatabaseFiles(slug: string, type: "database" | "backup"): void {
  if (type === "database" && slug === appStore.get("event.activeDatabaseSlug")) {
    throw new Error("Cannot delete the active database");
  }

  const { dbPath, dbBackupPath } = getDbPaths(slug);
  const targetPath = type === "database" ? dbPath : dbBackupPath;
  fs.rmSync(targetPath, { force: true });
  fs.rmSync(`${targetPath}-wal`, { force: true });
  fs.rmSync(`${targetPath}-shm`, { force: true });
}

export function listEventDatabaseSlugs(): string[] {
  const dbFolder = getDbFolder();
  if (!fs.existsSync(dbFolder)) return [];

  return fs
    .readdirSync(dbFolder)
    .filter((fileName) => fileName.endsWith(".db") && !fileName.endsWith("-backup.db"))
    .map((fileName) => fileName.slice(0, -3));
}

export function listEventDatabaseBackupSlugs(): string[] {
  const dbFolder = getDbFolder();
  if (!fs.existsSync(dbFolder)) return [];

  return fs
    .readdirSync(dbFolder)
    .filter((fileName) => fileName.endsWith("-backup.db"))
    .map((fileName) => fileName.slice(0, -"-backup.db".length));
}

export function resolveUniqueSlug(baseSlug: string): string {
  const existingSlugs = new Set(listEventDatabaseSlugs());
  if (!existingSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) suffix++;
  return `${baseSlug}-${suffix}`;
}

export function adoptLegacyDatabaseIfPresent(): void {
  if (appStore.get("legacyDbMigrated")) return;

  const { dbFolder } = getDbPaths("legacy");
  const legacyDbPath = path.join(dbFolder, "Bear100Devdb.db");
  const legacyBackupPath = path.join(dbFolder, "Bear100db-backup.db");
  const eventDatabaseSlugs = listEventDatabaseSlugs().filter((slug) => slug !== "Bear100Devdb");
  if (!fs.existsSync(legacyDbPath) || eventDatabaseSlugs.length > 0) return;

  const eventName = appStore.get("event.name") as string;
  const slug = slugify(eventName) || "default-event";
  const { dbPath, dbBackupPath } = getDbPaths(slug);

  fs.renameSync(legacyDbPath, dbPath);
  if (fs.existsSync(legacyBackupPath)) fs.renameSync(legacyBackupPath, dbBackupPath);
  appStore.set("event.activeDatabaseSlug", slug);
  appStore.set("legacyDbMigrated", true);
}

export function isDatabaseConnected(): boolean {
  return db !== null;
}

export function getDatabaseConnection(): Database.Database {
  if (!db) throw new Error("Database connection not initialized");
  return db;
}
