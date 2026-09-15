import Database from "better-sqlite3";
import { CreateTables } from "../tables-db";

// Shared by module test files that only need a schema-complete in-memory database.
export function createTestDatabase(): Database.Database {
  const db = new Database(":memory:");
  CreateTables(db);
  return db;
}
