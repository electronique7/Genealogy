const { createClient } = require('@libsql/client/http');

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let _client;
let _initialized = false;
let _initPromise = null;

function getClient() {
  if (!_client) {
    if (!TURSO_URL) throw new Error('TURSO_URL environment variable is required');
    _client = createClient({ url: TURSO_URL, authToken: TURSO_AUTH_TOKEN });
  }
  return _client;
}

async function ensureInit() {
  if (_initialized) return;
  if (!_initPromise) {
    _initPromise = _initSchema().then(() => { _initialized = true; });
  }
  return _initPromise;
}

async function _initSchema() {
  const c = getClient();
  const ddl = [
    `CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, title TEXT, author TEXT, publication TEXT, text TEXT, ref_number TEXT, type TEXT)`,
    `CREATE TABLE IF NOT EXISTS individuals (id TEXT PRIMARY KEY, given_name TEXT, surname TEXT, name_raw TEXT, sex TEXT CHECK(sex IN ('M','F','U')), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, husband_id TEXT REFERENCES individuals(id), wife_id TEXT REFERENCES individuals(id), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS family_members (family_id TEXT REFERENCES families(id) ON DELETE CASCADE, individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE, role TEXT CHECK(role IN ('CHILD','HUSBAND','WIFE')), PRIMARY KEY (family_id, individual_id, role))`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE, family_id TEXT REFERENCES families(id) ON DELETE CASCADE, event_type TEXT NOT NULL, date_text TEXT, date_sort TEXT, place TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE, family_id TEXT REFERENCES families(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS source_citations (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT REFERENCES sources(id), individual_id TEXT REFERENCES individuals(id) ON DELETE CASCADE, event_id INTEGER REFERENCES events(id) ON DELETE CASCADE, citation_text TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_events_individual ON events(individual_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_family ON events(family_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_fm_individual ON family_members(individual_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fm_family ON family_members(family_id)`,
    `CREATE INDEX IF NOT EXISTS idx_families_husband ON families(husband_id)`,
    `CREATE INDEX IF NOT EXISTS idx_families_wife ON families(wife_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_individual ON notes(individual_id)`,
    `CREATE INDEX IF NOT EXISTS idx_individuals_surname ON individuals(surname)`,
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, detail TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(created_at)`,
  ];
  for (const sql of ddl) {
    await c.execute(sql);
  }

  try { await c.execute(`ALTER TABLE individuals ADD COLUMN nickname TEXT`); } catch (_) {}

  await _seedDefaultAdmin(c);
}

async function _seedDefaultAdmin(c) {
  const result = await c.execute(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (result.rows.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    await c.execute({ sql: `INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)`, args: ['admin', '', hash, 'admin'] });
    console.log('[db] Default admin created — username: admin  password: admin123');
  }
}

const db = {
  async get(sql, ...args) {
    await ensureInit();
    const result = await getClient().execute({ sql, args });
    return result.rows[0] ?? null;
  },
  async all(sql, ...args) {
    await ensureInit();
    const result = await getClient().execute({ sql, args });
    return result.rows;
  },
  async run(sql, ...args) {
    await ensureInit();
    const result = await getClient().execute({ sql, args });
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };
  },
  async batch(stmts) {
    await ensureInit();
    await getClient().batch(stmts.map(s => ({ sql: s.sql, args: s.args ?? [] })), 'write');
  },
};

function getDb() {
  return db;
}

module.exports = { getDb };
