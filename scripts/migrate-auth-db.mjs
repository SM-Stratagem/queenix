#!/usr/bin/env node
/**
 * Queenix Gym — create the SQLite tables BetterAuth expects.
 *
 * The official BetterAuth `@better-auth/cli migrate` only works with the
 * built-in Kysely adapter, but we use Drizzle against better-sqlite3 for
 * local dev. Manually create the four core tables here so BetterAuth can
 * sign users up on first request without a separate schema-generation step.
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/migrate-auth-db.mjs
 */
import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DB_PATH =
  process.env.AUTH_DB_PATH ||
  path.join(ROOT, "apps/web/.data/queenix-auth.db")

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma("journal_mode = WAL")

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    fullName TEXT,
    avatarUrl TEXT,
    phone TEXT,
    phoneVerified INTEGER NOT NULL DEFAULT 0,
    activeRole TEXT NOT NULL DEFAULT 'member',
    roles TEXT NOT NULL DEFAULT '["member"]'
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER,
    updatedAt INTEGER
  )`,
]

for (const sql of STATEMENTS) {
  db.exec(sql)
}

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
console.log(`migrated. Tables at ${DB_PATH}:`)
for (const row of tables) console.log(`  ${row.name}`)

db.close()
