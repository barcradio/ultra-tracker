import Database from 'better-sqlite3';

global.shared = {
    targetLanguage: 'eng',
    dbConnection: Database,
    dbPath: "./Database",
    dbFullPath: "./Database/Bear100Devdb.db"
  };
  export default global;