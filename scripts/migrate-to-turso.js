// Migrates data from local genealogy.db to Turso
// Usage: node scripts/migrate-to-turso.js
try { require('/Users/joe/Web Projects/Genealogy-1/server/node_modules/dotenv').config(); } catch (_) {}
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('/Users/joe/Web Projects/Genealogy-1/server/node_modules/@libsql/client');
const path = require('path');

const local = new DatabaseSync(path.join(__dirname, '../genealogy.db'));
const turso = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, title TEXT, author TEXT, publication TEXT, text TEXT, ref_number TEXT, type TEXT)`,
    `CREATE TABLE IF NOT EXISTS individuals (id TEXT PRIMARY KEY, given_name TEXT, surname TEXT, name_raw TEXT, sex TEXT, nickname TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, husband_id TEXT, wife_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS family_members (family_id TEXT, individual_id TEXT, role TEXT, PRIMARY KEY (family_id, individual_id, role))`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, individual_id TEXT, family_id TEXT, event_type TEXT NOT NULL, date_text TEXT, date_sort TEXT, place TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, individual_id TEXT, family_id TEXT, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS source_citations (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT, individual_id TEXT, event_id INTEGER, citation_text TEXT)`,
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer', active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, detail TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  ];
  for (const sql of stmts) {
    await turso.execute(sql);
  }
  console.log('Schema initialized.\n');
}

const TABLES = [
  'sources',
  'individuals',
  'families',
  'family_members',
  'events',
  'notes',
  'source_citations',
  'users',
  'activity_log',
];

async function migrateTable(tableName) {
  let rows;
  try {
    rows = local.prepare(`SELECT * FROM ${tableName}`).all();
  } catch (e) {
    console.log(`  Skipping ${tableName}: ${e.message}`);
    return;
  }
  if (rows.length === 0) {
    console.log(`  ${tableName}: empty`);
    return;
  }

  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`;

  // Batch in chunks of 100 rows per batch request
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await turso.batch(chunk.map(row => ({ sql, args: cols.map(c => row[c] ?? null) })), 'write');
    process.stdout.write('.');
  }
  console.log(`  ${tableName}: ${rows.length} rows`);
}

async function main() {
  console.log('Migrating local genealogy.db → Turso...\n');
  await initSchema();
  for (const table of TABLES) {
    process.stdout.write(`Migrating ${table}... `);
    await migrateTable(table);
  }
  console.log('\nDone!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
