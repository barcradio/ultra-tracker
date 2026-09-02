import { migrate } from "@blackglory/better-sqlite3-migrations";
import { getDatabaseConnection } from "./connect-db";
import { migrations } from "./migrations-db";
import * as tableDefs0 from "./schema/table-definitions-v0";
import * as tableDefs1 from "./schema/table-definitions-v1";
import * as tableDefs2 from "./schema/table-definitions-v2";
import * as tableDefs3 from "./schema/table-definitions-v3";
import * as tableDefs4 from "./schema/table-definitions-v4";
import * as tableDefs5 from "./schema/table-definitions-v5";

const userVersion: number = 5;
let tableDefs;

interface Table {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string;
}

export function applyMigrations() {
  const db = getDatabaseConnection();

  try {
    console.log(`Applying database migrations`);
    for (let index = 0; index <= userVersion; index++) {
      if (index == 0) continue; // skip schema base revision

      const currentVersion = db.pragma("user_version", { simple: true }) as number;
      if (currentVersion == userVersion) return;

      const migrationVersion = currentVersion + 1;

      console.log(
        `[begin] pragma user_version: current: ${currentVersion} target: ${migrationVersion}`
      );
      migrate(db, migrations, migrationVersion);
      db.pragma(`user_version = ${migrationVersion}`);
      console.log(`[success] pragma user_version: ${db.pragma("user_version", { simple: true })}`);
    }
  } catch {
    db.pragma(`user_version = ${Math.max(0, userVersion - 1)}`);
    console.log(
      `[error] pragma user_version: ${db.pragma("user_version", { simple: true })} reverted`
    );
  }
}

export function validateDatabaseTables() {
  console.log("validateDatabaseTables");

  const tableNames = getTableNames();

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

    case 4:
      tableDefs = tableDefs4;
      break;

    case 5:
      tableDefs = tableDefs5;
      break;
  }

  for (const key in tableDefs.expectedTableNames) {
    type TableDef = keyof typeof tableDefs;
    const name = tableDefs.expectedTableNames[key] as TableDef;

    if (!tableNames.find((element) => element == name)) {
      console.log(`Table not found: ${tableDefs.expectedTableNames[key]}`);
      createTable(tableDefs.expectedTableNames[key], tableDefs[name]);
    }
  }

  if (tableDefs.Version < userVersion) applyMigrations();
}

export function getTableNames(): string[] {
  const db = getDatabaseConnection();
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

export function getColumnNamesFromTable(tableName: string): string[] {
  const db = getDatabaseConnection();
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
export function CreateTables() {
  const result =
    createAthletesTable() &&
    createEventLogTable() &&
    createTimeRecordsTable() &&
    createStationsTable() &&
    createOutputTable() &&
    createStatusTable() &&
    createOpenSplitTimePushStatusTable() &&
    createRFIDInboxTable() &&
    createRFIDPendingWritesTable();

  return result ? `Default tables were successfully created.` : `Database Create Failed`;
}

function createTable(tableName: string, tabledefinition: string): boolean {
  const db = getDatabaseConnection();

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

export const createAthletesTable = () =>
  createTable(tableDefs.expectedTableNames.Athletes, tableDefs.Athletes);
export const createEventLogTable = () =>
  createTable(tableDefs.expectedTableNames.EventLog, tableDefs.EventLog);
export const createTimeRecordsTable = () =>
  createTable(tableDefs.expectedTableNames.TimeRecords, tableDefs.TimeRecords);
export const createStationsTable = () =>
  createTable(tableDefs.expectedTableNames.Stations, tableDefs.Stations);
export const createOutputTable = () =>
  createTable(tableDefs.expectedTableNames.Output, tableDefs.Output);
export const createStatusTable = () =>
  createTable(tableDefs.expectedTableNames.Status, tableDefs.Status);
export const createRFIDInboxTable = () =>
  createTable(tableDefs.expectedTableNames.RFIDInbox, tableDefs.RFIDInbox);
export const createOpenSplitTimePushStatusTable = () =>
  createTable(
    tableDefs.expectedTableNames.OpenSplitTimePushStatus,
    tableDefs.OpenSplitTimePushStatus
  );
export const createRFIDPendingWritesTable = () =>
  createTable(tableDefs.expectedTableNames.RFIDPendingWrites, tableDefs.RFIDPendingWrites);

export function ClearTables() {
  const result =
    clearAthletesTable() &&
    clearEventsTable() &&
    clearRunnersTable() &&
    clearStationsTable() &&
    clearOutputTable() &&
    clearStatusTable() &&
    clearOpenSplitTimePushStatusTable();

  return result ? `Database tables cleared; Reinitialize or Restart!` : `Database Clear Failed`;
}

function clearTable(tableName: string): boolean {
  const db = getDatabaseConnection();
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

export const clearAthletesTable = () => clearTable(tableDefs.expectedTableNames.Athletes);
export const clearEventsTable = () => clearTable(tableDefs.expectedTableNames.EventLog);
export const clearRunnersTable = () => clearTable(tableDefs.expectedTableNames.TimeRecords);
export const clearStationsTable = () => clearTable(tableDefs.expectedTableNames.Stations);
export const clearOutputTable = () => clearTable(tableDefs.expectedTableNames.Output);
export const clearStatusTable = () => clearTable(tableDefs.expectedTableNames.Status);
export const clearOpenSplitTimePushStatusTable = () =>
  clearTable(tableDefs.expectedTableNames.OpenSplitTimePushStatus);
