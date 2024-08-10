import fs from "fs";
import Database, { Statement } from "better-sqlite3";
import global from "../../shared/global";
import { RecordType, Runner, TimingRecord } from "../../shared/models";

export abstract class dblocal {
  public static ConnectToDB() {
    let db: Database;
    const dbPath = global.shared.dbPath;
    const dbFullPath = global.shared.dbFullPath;
    const tableCount: number = 5;

    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

    try {
      db = global.shared.dbConnection = new Database(dbFullPath);
      db.pragma("journal_mode = WAL");
      console.log("Connected to SQLite Database: " + dbFullPath);
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.log(`Unable to connect to or create database: ${e.message}`);
        return;
      }
    }

    const tables: Statement = db.prepare(`SELECT count(*) FROM sqlite_master WHERE type='table'`);
    const result: object = tables.get();

    if (result["count(*)"] < tableCount) {
      CreateTables();
    }
  }
}

export function InsertOrUpdateTimingRecord(record: TimingRecord) {
  const db: Database = global.shared.dbConnection;
  let insert: Statement, update: Statement;

  const stationID: number = global.shared.myStationID as number;
  const dateISO: string = record.datetime.toISOString();
  const sent: number = 0;

  const query = db.prepare(`SELECT * FROM StaEvents WHERE bib_id = ?`).get(record.bib);
  if (query?.bib_id == record.bib) {
    switch (record.type) {
      case RecordType.In: {
        update = db.prepare(
          `UPDATE StaEvents SET station_id = '${stationID}', time_in = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`
        );
        break;
      }
      case RecordType.Out: {
        update = db.prepare(
          `UPDATE StaEvents SET station_id = '${stationID}', time_out = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`
        );
        break;
      }
      case RecordType.InOut: {
        update = db.prepare(
          `UPDATE StaEvents SET station_id = '${stationID}', time_in = '${dateISO}', time_out = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`
        );
        break;
      }
    }
    update.run(record.bib);
  } else {
    insert = db.prepare(
      `INSERT INTO StaEvents (bibId, stationId, timeIn, timeOut, lastChanged, sent) VALUES (?, ?, ?, ?, ?, ?)`
    );

    switch (record.type) {
      case RecordType.In: {
        insert.run(record.bib, stationID, dateISO, null, dateISO, sent);
        break;
      }
      case RecordType.Out: {
        insert.run(record.bib, stationID, null, dateISO, dateISO, sent);
        break;
      }
      case RecordType.InOut: {
        insert.run(record.bib, stationID, dateISO, dateISO, dateISO, sent);
        break;
      }
    }
  }
}

export function LookupAthletesRunnerByBib(bibNumber: number): Runner | undefined {
  const db: Database = global.shared.dbConnection;

  let result: Runner | undefined;

  try {
    const AthletesRunner = db.prepare(`SELECT * FROM Athletes WHERE Bib = ?`).get(bibNumber);

    // neither of these checks seem to work that well
    if (AthletesRunner.Bib === undefined || typeof AthletesRunner.Bib !== "number")
      return undefined;

    const runner: Runner = {
      index: AthletesRunner.index,
      bib: AthletesRunner.Bib,
      firstname: AthletesRunner.FirstName,
      lastname: AthletesRunner.LastName,
      gender: AthletesRunner.gender,
      age: AthletesRunner.Age,
      city: AthletesRunner.city,
      state: AthletesRunner.State,
      emPhone: AthletesRunner.EmergencyPhone,
      emName: AthletesRunner.EmergencyName,
      dns: false,
      dnf: false,
      dnfStation: 0,
      dnfDateTime: undefined
    };

    result = runner;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(e.message);
      result = undefined;
    }
  }

  return result;
}

export function CreateTables(): boolean {
  const db: Database = global.shared.dbConnection;
  let result: string;
  let CmdResult: Statement;

  //Create each of the tables
  try {
    CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS StaEvents (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0),
        stationId INTEGER,
        timeIn DATETIME,
        timeOut DATETIME,
        lastChanged TEXT,
        sent BOOLEAN DEFAULT (FALSE)
        )`);

    result = CmdResult.run();
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to create 'StaEvents' table ${result}`);
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
        lastChanged TEXT,
        sent BOOLEAN DEFAULT (FALSE)
        )`);

    result = CmdResult.run();
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to create 'Eventlog' table ${result}`);
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
        emergencyPhone INTEGER,
        emergencyName TEXT
        )`);

    result = CmdResult.run();
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to create 'Athletes' table ${result}`);
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
        description TEXT,
        location BLOB,
        operators BLOB,
        distance REAL,
        identifier TEXT
        )`);

    result = CmdResult.run();
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to create 'Stations' table ${result}`);
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

    result = CmdResult.run();
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to create 'Output' table ${result}`);
      return false;
    }
  }
  console.log(`Default tables were successfully created.`);
  return true;
}

export function ClearAthletesTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;

  try {
    CmdResult = db.prepare(`DELETE * FROM Athletes`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'Athletes' table ${result}`);
    }
    return false;
  }
}

export function ClearEventsTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;

  try {
    CmdResult = db.prepare(`DELETE * FROM EventLog`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'EventLog' table ${result}`);
    }
    return false;
  }
}

export function ClearStaEventsTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;
  try {
    CmdResult = db.prepare(`DELETE * FROM StaEvents`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'StaEvents' table ${result}`);
    }
    return false;
  }
}

export function ClearStationsTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;

  try {
    CmdResult = db.prepare(`DELETE * FROM Stations`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'Stations' table ${result}`);
    }
    return false;
  }
}

export function ClearOutputTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;

  try {
    CmdResult = db.prepare(`DELETE * FROM Output`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'Output' table ${result}`);
    }
    return false;
  }
}


export function AthletesLoadTable(): boolean {
  const db: Database = global.shared.dbConnection;
  let CmdResult: Statement;
  let result: string;
  
  // Read file via a browser
  // fs.createReadStream()
  // .readFileSync('foo.txt','utf8');

  // Loop through the csv file
  
  //Get a line from the csv file (verify the column header names)

  //Format/convert data from strings into loadable data

  try {
    CmdResult = db.prepare(`INSERT INTO Athletes ("bibId", "firstName", "lastName", "gender",
      "age", "city", "state", "emergencyPhone", "emergencyName", )`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'Output' table ${result}`);
    }
    return false;
  }
}
