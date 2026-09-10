import { IMigration } from "@blackglory/better-sqlite3-migrations";
import Database from "better-sqlite3";
import * as tableDefs0 from "./schema/table-definitions-v0";
import * as tableDefs2 from "./schema/table-definitions-v2";
import * as tableDefs3 from "./schema/table-definitions-v3";

// Some real-world databases have already reached a later table shape (e.g. via a build that
// scaffolded current-shape tables without stamping a matching user_version pragma), so each
// migration step below checks table/column state instead of assuming a fixed starting shape.
function tableExists(db: Database.Database, tableName: string): boolean {
  return (
    db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?`).get(tableName) !==
    undefined
  );
}

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  return (db.pragma(`table_info(${tableName})`) as Array<{ name: string }>).some(
    (column) => column.name === columnName
  );
}

export const migrations: IMigration[] = [
  {
    version: 1,
    up: (db: Database.Database) => {
      if (tableExists(db, "Status")) return; // already split into Status; nothing to prepare
      if (!columnExists(db, "Athletes", "status")) {
        db.exec(`ALTER TABLE Athletes ADD COLUMN status INTEGER;`);
      }
    },
    down: `
        DROP TABLE Athletes;
        CREATE TABLE IF NOT EXISTS Athletes (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs0.Athletes});
      `
  },
  {
    version: 2,
    up: (db: Database.Database) => {
      if (!tableExists(db, "Status")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS Status (
            "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs2.Status});
        `);
        if (columnExists(db, "Athletes", "dns")) {
          db.exec(`
            INSERT INTO Status (bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress)
              SELECT bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, status FROM Athletes
              WHERE EXISTS (SELECT 1 FROM Athletes LIMIT 1);
          `);
        }
      }

      for (const column of [
        "dns",
        "dnf",
        "dnfType",
        "dnfStation",
        "dnfDateTime",
        "note",
        "status"
      ]) {
        if (columnExists(db, "Athletes", column)) {
          db.exec(`ALTER TABLE Athletes DROP COLUMN ${column};`);
        }
      }

      if (tableExists(db, "StationEvents") && !tableExists(db, "TimeRecords")) {
        db.exec(`ALTER TABLE StationEvents RENAME TO TimeRecords;`);
      }
    },
    down: `
        ALTER TABLE Athletes ADD COLUMN dns INTEGER;
        ALTER TABLE Athletes ADD COLUMN dnf INTEGER;
        ALTER TABLE Athletes ADD COLUMN dnfType TEXT;
        ALTER TABLE Athletes ADD COLUMN dnfStation TEXT;
        ALTER TABLE Athletes ADD COLUMN dnfDateTime DATETIME;
        ALTER TABLE Athletes ADD COLUMN note TEXT;
        ALTER TABLE Athletes ADD COLUMN status INTEGER;
        INSERT INTO Athletes (bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, status)
          SELECT bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress FROM Status
          WHERE EXISTS (SELECT 1 FROM Athletes LIMIT 1);
        DROP TABLE Status;
        ALTER TABLE TimeRecords RENAME TO StationEvents;
      `
  },
  {
    version: 3,
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS RFIDInbox (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          ${tableDefs3.RFIDInbox}
        );
        CREATE TABLE IF NOT EXISTS RFIDPendingWrites (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          ${tableDefs3.RFIDPendingWrites}
        );
        CREATE TABLE IF NOT EXISTS OpenSplitTimePushStatus (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          ${tableDefs3.OpenSplitTimePushStatus}
        );
        CREATE TABLE IF NOT EXISTS Watchlist (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs3.Watchlist});
        CREATE TABLE IF NOT EXISTS EventMeta (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs3.EventMeta});
        DROP TABLE IF EXISTS StationEvents;
      `);

      // Only convert Status if it's still on the old dns/dnf shape; already-v3 databases skip this.
      if (columnExists(db, "Status", "dns")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS Status_v3 (
            "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs3.Status});
          INSERT INTO Status_v3 (bibId, dropped, dropReason, dropStation, dropDateTime, note, progress)
            SELECT bibId,
              CASE WHEN dns = 1 OR dnf = 1 THEN 1 ELSE 0 END,
              CASE WHEN dns = 1 THEN 'did-not-start' WHEN dnf = 1 THEN dnfType ELSE NULL END,
              CASE WHEN dnf = 1 THEN dnfStation ELSE NULL END,
              CASE WHEN dnf = 1 THEN dnfDateTime ELSE NULL END,
              note, progress
            FROM Status
            WHERE EXISTS (SELECT 1 FROM Status LIMIT 1);
          DROP TABLE Status;
          ALTER TABLE Status_v3 RENAME TO Status;
        `);
      }
    },
    down: `
        DROP TABLE IF EXISTS EventMeta;
        DROP TABLE IF EXISTS Watchlist;
        CREATE TABLE IF NOT EXISTS Status_v2 (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs2.Status});
        INSERT INTO Status_v2 (bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress)
          SELECT bibId,
            CASE WHEN dropReason = 'did-not-start' THEN 1 ELSE 0 END,
            CASE WHEN dropped = 1 AND dropReason != 'did-not-start' THEN 1 ELSE 0 END,
            CASE WHEN dropReason != 'did-not-start' THEN dropReason ELSE NULL END,
            dropStation,
            dropDateTime,
            note, progress
          FROM Status
          WHERE EXISTS (SELECT 1 FROM Status LIMIT 1);
        DROP TABLE Status;
        ALTER TABLE Status_v2 RENAME TO Status;
        DROP TABLE IF EXISTS RFIDInbox;
        DROP TABLE IF EXISTS RFIDPendingWrites;
        DROP TABLE IF EXISTS OpenSplitTimePushStatus;
      `
  },
  {
    version: 4,
    up: (db: Database.Database) => {
      if (!columnExists(db, "EventMeta", "openSplitTime")) {
        db.exec(`ALTER TABLE EventMeta ADD COLUMN openSplitTime TEXT;`);
      }
    },
    down: `
        ALTER TABLE EventMeta DROP COLUMN openSplitTime;
      `
  }
];
