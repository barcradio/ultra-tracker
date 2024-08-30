export const stationEvents: string = `
      bibId INTEGER DEFAULT (0),
      stationId INTEGER,
      timeIn DATETIME,
      timeOut DATETIME,
      timeModified DATETIME,
      note TEXT,
      sent BOOLEAN DEFAULT (FALSE);
      status INTEGER`;

/* The purpose of the Eventlog table is to be a somewhat redundant location to keep record
    of all events to provide a searchable log in a */
export const eventLog: string = `
      bibId INTEGER DEFAULT (0),
      stationId INTEGER,
      timeIn DATETIME,
      timeOut DATETIME,
      timeModified DATETIME,
      note TEXT,
      sent BOOLEAN DEFAULT (FALSE)
      status INTEGER`;

/*  The Athletes table is used to store the data submitted before the 
    start of the race listing all persons and their emergency contact information.
    There is still the possibility that additional runners could be added after the start.*/
export const athletes: string = `
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
      dnfDateTime DATETIME`;

/*  The Stations table is used to store the operators and the number of the runner station. */
export const stations = `
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
      operators BLOB`;

/*  The Output table is used to store the final data that is displayed in the Adilas database and is
    the combination of all stations data.  If another station sends a csv file of their report, that data
    will be loaded into the table to indicate the overall progress of a given runner for display.*/
export const output = `
      bibId INTEGER DEFAULT (0),
      inJSON BLOB,
      outJSON BLOB,
      dnf BOOLEAN,
      dns BOOLEAN,
      Last_changed DATETIME`;
