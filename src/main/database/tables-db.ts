import { migrate } from "@blackglory/better-sqlite3-migrations";
import Database from "better-sqlite3";
import { migrations } from "./migrations-db";
import * as tableDefs0 from "./schema/table-definitions-v0";
import * as tableDefs1 from "./schema/table-definitions-v1";
import * as tableDefs2 from "./schema/table-definitions-v2";
import * as tableDefs3 from "./schema/table-definitions-v3";

const userVersion: number = 3;
let tableDefs;

interface Table {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string;
}

export function applyMigrations(db: Database.Database) {
  // tracked outside the try so a failure can revert to the version the database
  // was actually on, rather than assuming it was one step below the target
  let currentVersion = db.pragma("user_version", { simple: true }) as number;

  try {
    console.log(`Applying database migrations`);
    for (let index = 0; index <= userVersion; index++) {
      if (index == 0) continue; // skip schema base revision

      currentVersion = db.pragma("user_version", { simple: true }) as number;
      if (currentVersion == userVersion) return;

      const migrationVersion = currentVersion + 1;

      console.log(
        `[begin] pragma user_version: current: ${currentVersion} target: ${migrationVersion}`
      );
      migrate(db, migrations, migrationVersion);
      db.pragma(`user_version = ${migrationVersion}`);
      console.log(`[success] pragma user_version: ${db.pragma("user_version", { simple: true })}`);
    }
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Migration failed: ${e.message}`);
    db.pragma(`user_version = ${currentVersion}`);
    console.log(
      `[error] pragma user_version: ${db.pragma("user_version", { simple: true })} reverted`
    );
  }
}

export function validateDatabaseTables(db: Database.Database) {
  console.log("validateDatabaseTables");

  const tableNames = getTableNames(db);

  switch (userVersion) {
    case 0:
      tableDefs = tableDefs0;
      break;

    case 1:
      tableDefs = tableDefs1;
      break;

    case 2:
      tableDefs = tableDefs2;
      break;

    case 3:
      tableDefs = tableDefs3;
      break;
  }

  for (const key in tableDefs.expectedTableNames) {
    type TableDef = keyof typeof tableDefs;
    const name = tableDefs.expectedTableNames[key] as TableDef;

    if (!tableNames.find((element) => element == name)) {
      console.log(`Table not found: ${tableDefs.expectedTableNames[key]}`);
      createTable(db, tableDefs.expectedTableNames[key], tableDefs[name]);
    }
  }

  if (tableDefs.Version < userVersion) applyMigrations(db);
}

export function getTableNames(db: Database.Database): string[] {
  const tableNames: string[] = [];

  try {
    const stmt = db.prepare(
      `SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );

    for (const table of stmt.iterate()) {
      const t: Table = table as unknown as Table;
      tableNames.push(t.name as string);
    }

    console.log(`Found tables: ${tableNames}`);
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to find table names: ${e.message}`);
  }

  return tableNames;
}

export function getColumnNamesFromTable(db: Database.Database, tableName: string): string[] {
  let columnNames: string[] = [];
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);

  for (const row of toColumnNames(stmt)) {
    columnNames = row as string[];
  }

  return columnNames;
}

function* toColumnNames(stmt) {
  yield stmt.columns().map((column) => column.name);
}

/* Recreate the database tables, will be the current schema version */
export function CreateTables(db: Database.Database) {
  tableDefs = tableDefs3;
  const result =
    createAthletesTable(db) &&
    createEventLogTable(db) &&
    createTimeRecordsTable(db) &&
    createStationsTable(db) &&
    createOutputTable(db) &&
    createStatusTable(db) &&
    createOpenSplitTimePushStatusTable(db) &&
    createRFIDInboxTable(db) &&
    createRFIDPendingWritesTable(db) &&
    createWatchlistTable(db) &&
    createEventMetaTable(db);

  return result ? `Default tables were successfully created.` : `Database Create Failed`;
}

function createTable(db: Database.Database, tableName: string, tabledefinition: string): boolean {
  try {
    db.prepare(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
      "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      ${tabledefinition}
      )`
    ).run();
    console.log(`Created '${tableName}' table`);

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to create '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const createAthletesTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.Athletes, tableDefs.Athletes);
export const createEventLogTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.EventLog, tableDefs.EventLog);
export const createTimeRecordsTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.TimeRecords, tableDefs.TimeRecords);
export const createStationsTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.Stations, tableDefs.Stations);
export const createOutputTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.Output, tableDefs.Output);
export const createStatusTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.Status, tableDefs.Status);
export const createRFIDInboxTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.RFIDInbox, tableDefs.RFIDInbox);
export const createOpenSplitTimePushStatusTable = (db: Database.Database) =>
  createTable(
    db,
    tableDefs.expectedTableNames.OpenSplitTimePushStatus,
    tableDefs.OpenSplitTimePushStatus
  );
export const createRFIDPendingWritesTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.RFIDPendingWrites, tableDefs.RFIDPendingWrites);
export const createWatchlistTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.Watchlist, tableDefs.Watchlist);
export const createEventMetaTable = (db: Database.Database) =>
  createTable(db, tableDefs.expectedTableNames.EventMeta, tableDefs.EventMeta);

export function ClearTables(db: Database.Database) {
  const result =
    clearAthletesTable(db) &&
    clearEventsTable(db) &&
    clearRunnersTable(db) &&
    clearStationsTable(db) &&
    clearOutputTable(db) &&
    clearStatusTable(db) &&
    clearOpenSplitTimePushStatusTable(db) &&
    clearWatchlistTable(db) &&
    clearEventMetaTable(db);

  return result ? `Database tables cleared; Reinitialize or Restart!` : `Database Clear Failed`;
}

function clearTable(db: Database.Database, tableName: string): boolean {
  try {
    db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();

    console.log(`Dropped '${tableName}' table`);

    if (tableName == tableDefs.expectedTableNames.Athletes) db.pragma(`user_version = 0`);

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to delete '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const clearAthletesTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.Athletes);
export const clearEventsTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.EventLog);
export const clearRunnersTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.TimeRecords);
export const clearStationsTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.Stations);
export const clearOutputTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.Output);
export const clearStatusTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.Status);
export const clearOpenSplitTimePushStatusTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.OpenSplitTimePushStatus);
export const clearWatchlistTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.Watchlist);
export const clearEventMetaTable = (db: Database.Database) =>
  clearTable(db, tableDefs.expectedTableNames.EventMeta);
