import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbDir = process.env.DB_PATH || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, 'tasks.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture TEXT,
    approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    due_date TEXT,
    completed_at DATETIME,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations for existing databases
try { db.exec('ALTER TABLE tasks ADD COLUMN completed_at DATETIME'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE tasks ADD COLUMN assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL'); } catch {}
try { db.exec('ALTER TABLE tasks ADD COLUMN assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL'); } catch {}

// Auto-approve all pre-existing users (before approval system was added)
db.exec(`UPDATE users SET approved = 1 WHERE approved = 0`);

export default db;
