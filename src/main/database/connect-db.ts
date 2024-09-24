import fs from "fs";
import Database from "better-sqlite3";

let db: Database.Database;

const dbFolder = "./Database";
const dbPath = `${dbFolder}/Bear100Devdb.db`;
const dbBackupPath = `${dbFolder}/Bear100db-backup.db`;

export function createDatabaseConnection() {
  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder);

  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    console.log("Connected to SQLite Database:" + dbPath);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(`Unable to connect or create database: ${e.message}`);
      return;
    }
  }

  setInterval(() => {
    console.log("starting backup...");
    console.log(`backup location: $${dbBackupPath}`);
    db.backup(dbBackupPath)
      .then(() => {
        console.log("backup complete");
      })
      .catch((err) => {
        console.log("backup failed:", err);
      });
  }, 300000);

  console.log(`pragma user_version: ${db.pragma("user_version", { simple: true })}`);
}

export function getDatabaseConnection(): Database.Database {
  if (!db) throw new Error("Database connection not initialized");
  return db;
}
