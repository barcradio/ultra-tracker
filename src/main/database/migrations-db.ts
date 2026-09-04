import { IMigration } from "@blackglory/better-sqlite3-migrations";
import * as tableDefs0 from "./schema/table-definitions-v0";
import * as tableDefs2 from "./schema/table-definitions-v2";
import * as tableDefs3 from "./schema/table-definitions-v3";
import * as tableDefs4 from "./schema/table-definitions-v4";

export const migrations: IMigration[] = [
  {
    version: 1,
    up: `
        ALTER TABLE Athletes ADD COLUMN status INTEGER;
      `,
    down: `
        DROP TABLE Athletes;
        CREATE TABLE IF NOT EXISTS Athletes (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs0.Athletes});
      `
  },
  {
    version: 2,
    up: `
        CREATE TABLE IF NOT EXISTS Status (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs2.Status});
        INSERT INTO Status (bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress)
          SELECT bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, status FROM Athletes
          WHERE EXISTS (SELECT 1 FROM Athletes LIMIT 1);
        ALTER TABLE Athletes DROP COLUMN dns;
        ALTER TABLE Athletes DROP COLUMN dnf;
        ALTER TABLE Athletes DROP COLUMN dnfType;
        ALTER TABLE Athletes DROP COLUMN dnfStation;
        ALTER TABLE Athletes DROP COLUMN dnfDateTime;
        ALTER TABLE Athletes DROP COLUMN note;
        ALTER TABLE Athletes DROP COLUMN status;
        ALTER TABLE StationEvents RENAME TO TimeRecords;
        `,
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
    up: `
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
      `,
    down: `
        DROP TABLE IF EXISTS RFIDInbox;
        DROP TABLE IF EXISTS RFIDPendingWrites;
        DROP TABLE IF EXISTS OpenSplitTimePushStatus;
      `
  },
  {
    version: 4,
    up: `
        CREATE TABLE IF NOT EXISTS Status_v4 (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs4.Status});
        INSERT INTO Status_v4 (bibId, dropped, dropReason, dropStation, dropDateTime, note, progress)
          SELECT bibId,
            CASE WHEN dns = 1 OR dnf = 1 THEN 1 ELSE 0 END,
            CASE WHEN dns = 1 THEN 'did-not-start' WHEN dnf = 1 THEN dnfType ELSE NULL END,
            CASE WHEN dnf = 1 THEN dnfStation ELSE NULL END,
            CASE WHEN dnf = 1 THEN dnfDateTime ELSE NULL END,
            note, progress
          FROM Status
          WHERE EXISTS (SELECT 1 FROM Status LIMIT 1);
        DROP TABLE Status;
        ALTER TABLE Status_v4 RENAME TO Status;
      `,
    down: `
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
      `
  }
];
