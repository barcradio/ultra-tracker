export const StationEvents: string = `
      bibId INTEGER DEFAULT (0), // TODO: Index
      stationId INTEGER, // TODO: Index
      timeIn DATETIME,
      timeOut DATETIME, // TODO: Index
      timeModified DATETIME,
      note TEXT,
      sent BOOLEAN DEFAULT (FALSE), // TODO: Index
      status INTEGER`; // TODO: Index

/* The purpose of the Eventlog table is to be a somewhat redundant location to keep record
    of all events to provide a searchable log in a */
export const EventLog: string = `
      bibId INTEGER DEFAULT (0),
      stationId TEXT,
      timeIn DATETIME,
      timeOut DATETIME,
      timeModified DATETIME,
      comments TEXT,
      sent BOOLEAN DEFAULT (FALSE),
      verbose BOOLEAN DEFAULT (FALSE)`; // TODO: Index

/*  The Athletes table is used to store the data submitted before the
    start of the race listing all persons and their emergency contact information.
    There is still the possibility that additional runners could be added after the start.*/
export const Athletes: string = `
      bibId INTEGER DEFAULT (0), // TODO: Index
      firstName TEXT,
      lastName TEXT,
      gender TEXT,
      age INTEGER DEFAULT (0),
      city TEXT,
      state TEXT,
      emergencyName TEXT,
      emergencyPhone INTEGER,
      dns INTEGER, // TODO: Index
      dnf INTEGER, // TODO: Index
      dnfType TEXT,
      dnfStation TEXT, // TODO: Index
      dnfDateTime DATETIME,
      note TEXT`;

/*  The Stations table is used to store the operators and the number of the runner station. */
export const Stations = `
      name TEXT,
      identifier TEXT, // TODO: Index
      description TEXT,
      location BLOB,
      distance REAL,
      dropbags INTEGER,
      crewaccess INTEGER,
      paceraccess INTEGER,
      shiftBegin DATETIME,
      cutofftime DATETIME,
      shiftEnd DATETIME,
      entrymode INTEGER,
      operators BLOB`;

/*  The Output table is used to store the final data that is displayed in the Adilas database and is
    the combination of all stations data.  If another station sends a csv file of their report, that data
    will be loaded into the table to indicate the overall progress of a given runner for display.*/
export const Output = `
      bibId INTEGER DEFAULT (0),
      inJSON BLOB,
      outJSON BLOB,
      dnf BOOLEAN,
      dns BOOLEAN,
      Last_changed DATETIME`;
