import { IMigration } from "@blackglory/better-sqlite3-migrations";
import * as tableDefs0 from "./schema/table-definitions-v0";
//import * as tableDefs1 from "./schema/table-definitions-v1";
import * as tableDefs2 from "./schema/table-definitions-v2";

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
  }
];
