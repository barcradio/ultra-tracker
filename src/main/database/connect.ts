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

  //Create Runners table
  try {
    CmdResult = db.prepare(
      `CREATE TABLE IF NOT EXISTS Runners ("index"INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, bib_id DEFAULT (0), station_id INTEGER, time_in DATETIME, time_out TEXT, sent BOOLEAN (FALSE) ) last_changed`
    );
    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create'Runners'table ${e.message}`);
      return false;
    }
  }

  //Create Events table
  try {
    CmdResult = db.prepare(
      `CREATE TABLE IF NOT EXISTS Events ("index"INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, bib_id DEFAULT (0), station_id INTEGER, time_in DATETIME, time_out TEXT, note sent BOOLEAN (FALSE) ) last_changed`
    );

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create'Runners'table ${e.message}`);
      return false;
    }
  }

  //Create StartList table
  try {
    CmdResult = db.prepare(
      `CREATE TABLE IF NOT EXISTS StartList ("index"INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, Bib DEFAULT (0), FirstName TEXT, LastName gender Age City State EmergencyPhone INTEGER, EmergencyName TEXT )`
    );

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create'Runners'table ${e.message}`);
      return false;
    }
  }

  //Create Stations table
  try {
    CmdResult = db.prepare(
      `CREATE TABLE IF NOT EXISTS Stations ("index"INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, StaName TEXT, Last_changed DATETIME )`
    );

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create'Runners'table ${e.message}`);
      return false;
    }
  }

  //Create Output table
  try {
    CmdResult = db.prepare(
      `CREATE TABLE IF NOT EXISTS Output ("index"INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, Bib DEFAULT (0), Sta1_in DATETIME, Sta1_out Sta2_in Sta2_out Sta3_in Sta3_out Sta4_in Sta4_out Sta5_in Sta5_out Sta6_in Sta6_out Sta7_in Sta7_out Sta8_in Sta8_out Sta9_in Sta9_out Sta10_in Sta10_out Sta11_in Sta11_out Sta12_in Sta12_out Sta13_in Sta13_out Sta14_in Sta14_out Sta15_in Sta15_out Sta16_in Sta16_out Sta17_in Sta17_out Sta18_in Sta18_out Sta19_in Sta19_out Sta20_in Sta20_out Dnf BOOLEAN, Dns Last_changed DATETIME )`
    );

    CmdResult.run();
  } catch (e) {
    if (e instanceof Error) {
      console.log(`Failed to create'Runners'table ${e.message}`);
      return false;
    }
  }

  console.log(`Default tables were successfully created.`);
  return true;
}

function clearTable(tableName: string): boolean {
  const db = getDatabaseConnection();
  try {
    const query = db.prepare(`DELETE * FROM ?`);
    query.run(tableName);
    return true;
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to delete'${tableName}'table: ${e.message}`);
    return false;
  }
}

export const clearStartListTable = () => clearTable("StartList");
export const clearEventsTable = () => clearTable("Events");
export const clearRunnersTable = () => clearTable("Runners");
export const clearStationsTable = () => clearTable("Stations");
export const clearOutputTable = () => clearTable("Output");
