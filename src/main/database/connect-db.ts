import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { app } from "electron";
import { appStore } from "../lib/store";
// The table helpers resolve the active connection at call time.
// eslint-disable-next-line import/no-cycle
import { CreateTables, applyMigrations } from "./tables-db";

let db: Database.Database | null = null;
let backupInterval: NodeJS.Timeout | null = null;

function getDbFolder(): string {
  return path.join(app.getPath("userData"), `event-databases`);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDbPaths(slug: string) {
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

export function closeActiveConnection(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }

  db?.close();
  db = null;
}

export function switchToDatabase(slug: string): void {
  const { dbFolder, dbPath, dbBackupPath } = getDbPaths(slug);

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

  closeActiveConnection();

  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    startBackupLoop(dbBackupPath);
    applyMigrations();
    appStore.set("event.activeDatabaseSlug", slug);
    console.log("Connected to SQLite Database:" + dbPath);
  } catch (e: unknown) {
    closeActiveConnection();
    if (e instanceof Error) {
      console.log(`Unable to connect or create database: ${e.message}`);
    }
  }

  if (db) console.log(`pragma user_version: ${db.pragma("user_version", { simple: true })}`);
}

export function createDatabaseFile(slug: string): void {
  const { dbFolder, dbPath } = getDbPaths(slug);

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

  closeActiveConnection();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  CreateTables();
  db.pragma("user_version = 5");
  closeActiveConnection();
  switchToDatabase(slug);
}

export function deleteDatabaseFiles(slug: string): void {
  if (slug === appStore.get("event.activeDatabaseSlug")) {
    throw new Error("Cannot delete the active database");
  }

  const { dbPath, dbBackupPath } = getDbPaths(slug);
  fs.rmSync(dbPath, { force: true });
  fs.rmSync(dbBackupPath, { force: true });
}

export function listEventDatabaseSlugs(): string[] {
  const dbFolder = getDbFolder();
  if (!fs.existsSync(dbFolder)) return [];

  return fs
    .readdirSync(dbFolder)
    .filter((fileName) => fileName.endsWith(".db") && !fileName.endsWith("-backup.db"))
    .map((fileName) => fileName.slice(0, -3));
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
