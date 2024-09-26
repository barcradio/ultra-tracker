import { migrate } from "@blackglory/better-sqlite3-migrations";
import { getDatabaseConnection } from "./connect-db";
import { migrations } from "./migrations-db";
import * as tableDefs from "./table-definitions";

const userVersion = 1;

export const expectedTableNames = {
  Athletes: "Athletes",
  EventLog: "EventLog",
  StationEvents: "StationEvents",
  Stations: "Stations",
  EventGrid: "Output"
};

interface Table {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string;
}

export function applyMigrations() {
  const db = getDatabaseConnection();
  const currentVersion = db.pragma("user_version", { simple: true });

  try {
    console.log(`[begin] pragma user_version: current: ${currentVersion} target: ${userVersion}`);
    migrate(db, migrations, userVersion);
  } catch (e) {
    db.pragma(`user_version = ${Math.max(0, userVersion - 1)}`);
    console.log(`[error] pragma user_version: ${db.pragma("user_version", { simple: true })}`);
  } finally {
    db.pragma(`user_version = ${userVersion}`);
    console.log(`[finally] pragma user_version: ${db.pragma("user_version", { simple: true })}`);
  }
}

export function validateDatabaseTables() {
  console.log("validateDatabaseTables");

  const tableNames = getTableNames();

  for (const key in expectedTableNames) {
    type TableDef = keyof typeof tableDefs;
    const name = expectedTableNames[key] as TableDef;

    if (!tableNames.find((element) => element == name)) {
      console.log(`Table not found: ${expectedTableNames[key]}`);
      createTable(expectedTableNames[key], tableDefs[name]); // eslint-disable-line import/namespace
    }
  }
  applyMigrations();
}

export function getTableNames(): string[] {
  const db = getDatabaseConnection();
  const tableNames: string[] = [];

  try {
    const stmt = db.prepare(
      `SELECT * FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'`
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

export function CreateTables() {
  const result =
    createAthletesTable() &&
    createEventLogTable() &&
    createStationEventsTable() &&
    createStationsTable() &&
    createOutputTable();

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

    if (tableName == expectedTableNames.Athletes) applyMigrations();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to create '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const createAthletesTable = () =>
  createTable(expectedTableNames.Athletes, tableDefs.Athletes);
export const createEventLogTable = () =>
  createTable(expectedTableNames.EventLog, tableDefs.EventLog);
export const createStationEventsTable = () =>
  createTable(expectedTableNames.StationEvents, tableDefs.StationEvents);
export const createStationsTable = () =>
  createTable(expectedTableNames.Stations, tableDefs.Stations);
export const createOutputTable = () => createTable(expectedTableNames.EventGrid, tableDefs.Output);

export function ClearTables() {
  const result =
    clearAthletesTable() &&
    clearEventsTable() &&
    clearRunnersTable() &&
    clearStationsTable() &&
    clearOutputTable();

  return result ? `Database tables cleared; Reinitialize or Restart!` : `Database Clear Failed`;
}

function clearTable(tableName: string): boolean {
  const db = getDatabaseConnection();
  try {
    db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();

    console.log(`Dropped '${tableName}' table`);

    if (tableName == expectedTableNames.Athletes) db.pragma(`user_version = 0`);

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to delete '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const clearAthletesTable = () => clearTable(expectedTableNames.Athletes);
export const clearEventsTable = () => clearTable(expectedTableNames.EventLog);
export const clearRunnersTable = () => clearTable(expectedTableNames.StationEvents);
export const clearStationsTable = () => clearTable(expectedTableNames.Stations);
export const clearOutputTable = () => clearTable(expectedTableNames.EventGrid);
