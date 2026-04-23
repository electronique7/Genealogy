const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { parseGedcom } = require('../server/gedcom/parser');

const gedFile = process.argv[2];
const dbFile = process.argv[3];

if (!gedFile || !dbFile) {
  console.error('Usage: node import-gedcom.js <gedcom-file> <db-file>');
  process.exit(1);
}

const gedPath = path.resolve(gedFile);
const dbPath = path.resolve(dbFile);

console.log(`Parsing ${gedPath}...`);

let parsed;
try {
  parsed = parseGedcom(gedPath);
} catch (err) {
  console.error('Parse failed:', err);
  process.exit(1);
}

const { individuals, families, sources } = parsed;
console.log(`Parsed: ${individuals.length} individuals, ${families.length} families, ${sources.length} sources`);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  DROP TABLE IF EXISTS source_citations;
  DROP TABLE IF EXISTS notes;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS family_members;
  DROP TABLE IF EXISTS families;
  DROP TABLE IF EXISTS individuals;
  DROP TABLE IF EXISTS sources;

  CREATE TABLE sources (
    id TEXT PRIMARY KEY, title TEXT, author TEXT, publication TEXT,
    text TEXT, ref_number TEXT, type TEXT
  );
  CREATE TABLE individuals (
    id TEXT PRIMARY KEY, given_name TEXT, surname TEXT, name_raw TEXT,
    sex TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE families (
    id TEXT PRIMARY KEY, husband_id TEXT, wife_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE family_members (
    family_id TEXT, individual_id TEXT, role TEXT,
    PRIMARY KEY (family_id, individual_id, role)
  );
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    individual_id TEXT, family_id TEXT,
    event_type TEXT NOT NULL, date_text TEXT, date_sort TEXT, place TEXT, note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    individual_id TEXT, family_id TEXT,
    content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE source_citations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT, individual_id TEXT, event_id INTEGER, citation_text TEXT
  );
`);

console.log('Writing to database...');

// node:sqlite transactions
db.exec('BEGIN');

try {
  const insSrc = db.prepare(
    'INSERT OR IGNORE INTO sources (id,title,author,publication,text,ref_number,type) VALUES (?,?,?,?,?,?,?)'
  );
  for (const s of sources) {
    insSrc.run(s.id, s.title, s.author, s.publication, s.text, s.ref_number, s.type);
  }
  console.log(`  Inserted ${sources.length} sources`);

  const insIndi = db.prepare(
    'INSERT OR IGNORE INTO individuals (id,given_name,surname,name_raw,sex) VALUES (?,?,?,?,?)'
  );
  const insEvent = db.prepare(
    'INSERT INTO events (individual_id,family_id,event_type,date_text,date_sort,place,note) VALUES (?,?,?,?,?,?,?)'
  );
  const insNote = db.prepare('INSERT INTO notes (individual_id,family_id,content) VALUES (?,?,?)');
  const insCite = db.prepare(
    'INSERT INTO source_citations (source_id,individual_id,event_id,citation_text) VALUES (?,?,?,?)'
  );

  let indiCount = 0;
  for (const p of individuals) {
    insIndi.run(p.id, p.given_name, p.surname, p.name_raw, p.sex);
    for (const ev of p.events) {
      insEvent.run(p.id, null, ev.event_type, ev.date_text, ev.date_sort, ev.place, ev.note);
    }
    for (const note of p.notes) {
      if (note && note.trim()) insNote.run(p.id, null, note.trim());
    }
    for (const cite of p.citations) {
      if (cite.source_id) insCite.run(cite.source_id, p.id, null, cite.citation_text);
    }
    indiCount++;
    if (indiCount % 1000 === 0) console.log(`  Processed ${indiCount} individuals...`);
  }
  console.log(`  Inserted ${indiCount} individuals`);

  const insFam = db.prepare('INSERT OR IGNORE INTO families (id,husband_id,wife_id) VALUES (?,?,?)');
  const insFamMember = db.prepare(
    'INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)'
  );

  let famCount = 0;
  for (const f of families) {
    insFam.run(f.id, f.husband_id, f.wife_id);
    if (f.husband_id) insFamMember.run(f.id, f.husband_id, 'HUSBAND');
    if (f.wife_id) insFamMember.run(f.id, f.wife_id, 'WIFE');
    for (const childId of f.children) {
      insFamMember.run(f.id, childId, 'CHILD');
    }
    for (const ev of f.events) {
      insEvent.run(null, f.id, ev.event_type, ev.date_text, ev.date_sort, ev.place, ev.note);
    }
    for (const note of f.notes) {
      if (note && note.trim()) insNote.run(null, f.id, note.trim());
    }
    famCount++;
  }
  console.log(`  Inserted ${famCount} families`);

  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('Insert failed:', err);
  process.exit(1);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_individual   ON events(individual_id);
  CREATE INDEX IF NOT EXISTS idx_events_family       ON events(family_id);
  CREATE INDEX IF NOT EXISTS idx_events_type         ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_fm_individual       ON family_members(individual_id);
  CREATE INDEX IF NOT EXISTS idx_fm_family           ON family_members(family_id);
  CREATE INDEX IF NOT EXISTS idx_families_husband    ON families(husband_id);
  CREATE INDEX IF NOT EXISTS idx_families_wife       ON families(wife_id);
  CREATE INDEX IF NOT EXISTS idx_notes_individual    ON notes(individual_id);
  CREATE INDEX IF NOT EXISTS idx_individuals_surname ON individuals(surname COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_individuals_given   ON individuals(given_name COLLATE NOCASE);
`);

db.exec('PRAGMA foreign_keys = ON');
db.close();
console.log('Done! Database written to:', dbPath);
