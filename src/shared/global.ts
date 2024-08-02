import Database from "better-sqlite3";

global.shared = {
  targetLanguage: "eng",
  dbConnection: Database,
  dbPath: "./Database",
  dbFullPath: "./Database/Bear100Devdb.db",
  // temp for development
  myStation: "5-temple-fork",
  myStationID: 5
};

export default global;
