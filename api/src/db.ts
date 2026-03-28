import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH =
  process.env.DB_PATH ?? path.resolve(__dirname, "../../collector/activity.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database not found at ${DB_PATH}. Run the collector first.`);
    }
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}
