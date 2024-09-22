import { IMigration } from "@blackglory/better-sqlite3-migrations";
import * as tableDefs from "./table-definitions";

export const migrations: IMigration[] = [
  {
    version: 1,
    up: `
        ALTER TABLE Athletes
        ADD COLUMN status INTEGER;
      `,
    down: `
        DROP TABLE Athletes;
        CREATE TABLE IF NOT EXISTS Athletes (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs.Athletes});
      `
  }
];
