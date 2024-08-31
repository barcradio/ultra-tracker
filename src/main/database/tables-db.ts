import { getDatabaseConnection } from "./connect-db";
import * as tableDefs from "./table-definitions";

let tableCount = 0;

export function validateDatabaseTables() {
  const db = getDatabaseConnection();
  const query = db.prepare(
    `SELECT count(*) FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'`
  );
  const result = query.get() as Record<string, number>;

  if (result["count(*)"] < tableCount) {
    CreateTables();
  }
}

export function getColumnNamesFromTable(tableName: string): string[] {
  const db = getDatabaseConnection();
  let columnNames: string[] = [];
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  toColumnNames(stmt);

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

    tableCount++;
    console.log(`Created '${tableName}' table`);
    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to create '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const createAthletesTable = () => createTable("Athletes", tableDefs.athletes);
export const createEventLogTable = () => createTable("EventLog", tableDefs.eventLog);
export const createStationEventsTable = () => createTable("StaEvents", tableDefs.stationEvents);
export const createStationsTable = () => createTable("Stations", tableDefs.stations);
export const createOutputTable = () => createTable("Output", tableDefs.output);

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

    tableCount--;
    console.log(`Dropped '${tableName}' table`);
    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to delete '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const clearAthletesTable = () => clearTable("Athletes");
export const clearEventsTable = () => clearTable("EventLog");
export const clearRunnersTable = () => clearTable("StaEvents");
export const clearStationsTable = () => clearTable("Stations");
export const clearOutputTable = () => clearTable("Output");
