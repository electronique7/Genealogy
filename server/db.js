const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'genealogy.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id          TEXT PRIMARY KEY,
      title       TEXT,
      author      TEXT,
      publication TEXT,
      text        TEXT,
      ref_number  TEXT,
      type        TEXT
    );

    CREATE TABLE IF NOT EXISTS individuals (
      id          TEXT PRIMARY KEY,
      given_name  TEXT,
      surname     TEXT,
      name_raw    TEXT,
      sex         TEXT CHECK(sex IN ('M','F','U')),
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS families (
      id          TEXT PRIMARY KEY,
      husband_id  TEXT REFERENCES individuals(id),
      wife_id     TEXT REFERENCES individuals(id),
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS family_members (
      family_id     TEXT REFERENCES families(id) ON DELETE CASCADE,
      individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE,
      role          TEXT CHECK(role IN ('CHILD','HUSBAND','WIFE')),
      PRIMARY KEY (family_id, individual_id, role)
    );

    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE,
      family_id     TEXT REFERENCES families(id) ON DELETE CASCADE,
      event_type    TEXT NOT NULL,
      date_text     TEXT,
      date_sort     TEXT,
      place         TEXT,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE,
      family_id     TEXT REFERENCES families(id) ON DELETE CASCADE,
      content       TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_citations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id     TEXT REFERENCES sources(id),
      individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE,
      event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
      citation_text TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_individual   ON events(individual_id);
    CREATE INDEX IF NOT EXISTS idx_events_family       ON events(family_id);
    CREATE INDEX IF NOT EXISTS idx_events_type         ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_fm_individual       ON family_members(individual_id);
    CREATE INDEX IF NOT EXISTS idx_fm_family           ON family_members(family_id);
    CREATE INDEX IF NOT EXISTS idx_families_husband    ON families(husband_id);
    CREATE INDEX IF NOT EXISTS idx_families_wife       ON families(wife_id);
    CREATE INDEX IF NOT EXISTS idx_notes_individual    ON notes(individual_id);
    CREATE INDEX IF NOT EXISTS idx_individuals_surname ON individuals(surname COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      email         TEXT,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')),
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT PRIMARY KEY,
      data    TEXT NOT NULL,
      expires INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER,
      username    TEXT,
      action      TEXT NOT NULL,
      entity_type TEXT,
      entity_id   TEXT,
      detail      TEXT,
      ip          TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_ts   ON activity_log(created_at);
  `);

  // Add nickname column to existing databases that predate this field
  try { db.exec('ALTER TABLE individuals ADD COLUMN nickname TEXT'); } catch (_) {}

  seedDefaultAdmin(db);
}

function seedDefaultAdmin(db) {
  const existing = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();
  if (!existing) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)`)
      .run('admin', '', hash, 'admin');
    console.log('[db] Default admin created — username: admin  password: admin123');
    console.log('[db] Change this password immediately via Admin > Users.');
  }
}

module.exports = { getDb, DB_PATH };
