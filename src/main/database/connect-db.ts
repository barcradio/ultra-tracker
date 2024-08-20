import fs from "fs";
import Database, { Statement } from "better-sqlite3";

let db: Database.Database;

const dbFolder = "./Database";
const dbPath = `${dbFolder}/Bear100Devdb.db`;

export function createDatabaseConnection() {
  const tableCount: number = 5;

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder);

  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    console.log("Connected to SQLite Database:" + dbPath);

    const query = db.prepare(`SELECT count(*) FROM sqlite_master WHERE type='table'`);
    const result = query.get() as Record<string, number>;

    if (result["count(*)"] < tableCount) CreateTables();
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(`Unable to connect or create database: ${e.message}`);
      return;
    }
  }
}

export function getDatabaseConnection(): Database.Database {
  if (!db) throw new Error("Database connection not initialized");
  return db;
}

// TODO: These should be moved to a separate file, but that creates a circular dependency
export function CreateTables(): boolean {
  const db = getDatabaseConnection();
  let CmdResult: Statement;

  //Create each of the tables
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS StaEvents (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0),
        stationId INTEGER,
        timeIn DATETIME,
        timeOut DATETIME,
        timeModified DATETIME,
        note TEXT,
        sent BOOLEAN DEFAULT (FALSE)
        )`);

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create 'StaEvents' table ${e.message}`);
      return false;
    }
  }

  /* The purpose of the Eventlog table is to be a somewhat redundant location to keep record
    of all events to provide a searchable log in a */
  //Create Eventlog table
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Eventlog (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0),
        stationId INTEGER,
        timeIn DATETIME,
        timeOut DATETIME,
        timeModified DATETIME,
        note TEXT,
        sent BOOLEAN DEFAULT (FALSE)
        )`);

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create 'Eventlog' table ${e.message}`);
      return false;
    }
  }

  //Create Athletes table
  /*  The Athletes table is used to store the data submitted before the 
      start of the race listing all persons and their emergency contact information.

      There is still the possibility that additional runners could be added after the start.
  */
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Athletes (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0),
        firstName TEXT,
        lastName TEXT,
        gender TEXT,
        age INTEGER DEFAULT (0),
        city TEXT,
        state TEXT,
        emergencyName TEXT,
        emergencyPhone INTEGER,
        dns INTEGER,
        dnf INTEGER,
        dnfStation INTEGER,
        dnfDateTime DATETIME
        )`);

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create 'Athletes' table ${e.message}`);
      return false;
    }
  }

  //Create Stations table
  /*  
  The Stations table is used to store the operators and the number of the runner station.
  */
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Stations (
      "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      identifier TEXT,
      description TEXT,
      location BLOB,
      distance REAL,
      dropbags INTEGER,
      crewaccess INTEGER,
      paceraccess INTEGER,
      cutofftime DATETIME,
      entrymode INTEGER,
      operators BLOB
      )`);

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create 'Stations' table ${e.message}`);
      return false;
    }
  }

  //Create Output table
  /*  
  The Output table is used to store the final data that is displayed in the Adilas database and is
  the combination of all stations data.  If another station sends a csv file of their report, that data
  will be loaded into the table to indicate the overall progress of a given runner for display.
    (space for up to 20 stations reports)
  */
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Output (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0),
        inJSON BLOB,
        outJSON BLOB,
        dnf BOOLEAN,
        dns BOOLEAN,
        Last_changed DATETIME
        )`);

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create 'Output' table ${e.message}`);
      return false;
    }
  }

  console.log(`Default tables were successfully created.`);
  return true;
}

export function ClearTables() {
  const result =
    clearStartListTable() &&
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
    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to delete '${tableName}' table: ${e.message}`);
    return false;
  }
}

export const clearStartListTable = () => clearTable("Athletes");
export const clearEventsTable = () => clearTable("EventLog");
export const clearRunnersTable = () => clearTable("StaEvents");
export const clearStationsTable = () => clearTable("Stations");
export const clearOutputTable = () => clearTable("Output");
