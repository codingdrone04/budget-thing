import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync } from "fs";

const DB_PATH = process.env.DB_PATH ?? join(import.meta.dir, "..", "data", "budget.db");
mkdirSync(join(DB_PATH, ".."), { recursive: true });

export const db = new Database(DB_PATH, { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  montant REAL,
  montant_annuel REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`);
