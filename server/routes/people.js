const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { logActivity, getIp } = require('../lib/log');

// GET /api/people?search=&surname=&sex=&page=1&limit=50&sortBy=surname&sortDir=asc
router.get('/', (req, res) => {
  const db = getDb();
  const { search = '', surname = '', sex = '', page = 1, limit = 50, sortBy = 'surname', sortDir = 'asc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];

  if (search) {
    // Split into tokens; each token must match the start of the first given name
    // OR appear anywhere in the surname — middle names are never required.
    const tokens = search.trim().split(/\s+/).filter(Boolean).slice(0, 4);
    const firstNameExpr = `lower(CASE WHEN instr(i.given_name,' ')>0 THEN substr(i.given_name,1,instr(i.given_name,' ')-1) ELSE i.given_name END)`;
    for (const token of tokens) {
      const t = token.toLowerCase();
      conditions.push(`(${firstNameExpr} LIKE ? OR lower(i.surname) LIKE ? OR lower(i.given_name) LIKE ?)`);
      params.push(`${t}%`, `%${t}%`, `%${t}%`);
    }
  }
  if (surname) {
    conditions.push(`lower(i.surname) = lower(?)`);
    params.push(surname);
  }
  if (sex && (sex === 'M' || sex === 'F')) {
    conditions.push(`i.sex = ?`);
    params.push(sex);
  }

  // Per-column text filters (cf_surname_type=contains&cf_surname_value=smith)
  const COL_FILTER_EXPRS = {
    surname:     `(lower(i.given_name) || ' ' || lower(i.surname))`,
    sex:         `lower(i.sex)`,
    birth_date:  `lower(COALESCE((SELECT date_text FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1),''))`,
    birth_place: `lower(COALESCE((SELECT place FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1),''))`,
    death_date:  `lower(COALESCE((SELECT date_text FROM events WHERE individual_id=i.id AND event_type='DEAT' LIMIT 1),''))`,
    death_place: `lower(COALESCE((SELECT place FROM events WHERE individual_id=i.id AND event_type='DEAT' LIMIT 1),''))`,
    burial_date: `lower(COALESCE((SELECT date_text FROM events WHERE individual_id=i.id AND event_type='BURI' LIMIT 1),''))`,
    burial_place:`lower(COALESCE((SELECT place FROM events WHERE individual_id=i.id AND event_type='BURI' LIMIT 1),''))`,
    family_count:`CAST((SELECT COUNT(*) FROM family_members WHERE individual_id=i.id) AS TEXT)`,
  };
  for (const col of Object.keys(COL_FILTER_EXPRS)) {
    const type = req.query[`cf_${col}_type`];
    const val  = (req.query[`cf_${col}_value`] || '').trim().toLowerCase();
    if (!type || !val) continue;
    const expr = COL_FILTER_EXPRS[col];
    if (type === 'begins_with')   { conditions.push(`${expr} LIKE ?`);     params.push(`${val}%`); }
    else if (type === 'contains')      { conditions.push(`${expr} LIKE ?`);     params.push(`%${val}%`); }
    else if (type === 'not_contains')  { conditions.push(`${expr} NOT LIKE ?`); params.push(`%${val}%`); }
    else if (type === 'exact')         { conditions.push(`${expr} = ?`);        params.push(val); }
    else if (type === 'ends_with')     { conditions.push(`${expr} LIKE ?`);     params.push(`%${val}`); }
  }

  // Per-column "hide blanks" filters (hb_birth_date=1, hb_death_date=1, etc.)
  const BLANK_CONDITIONS = {
    surname:     `(i.surname IS NOT NULL AND i.surname != '')`,
    given_name:  `(i.given_name IS NOT NULL AND i.given_name != '')`,
    sex:         `i.sex IN ('M','F')`,
    birth_date:  `EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='BIRT' AND date_text IS NOT NULL AND date_text!='')`,
    death_date:  `EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='DEAT' AND date_text IS NOT NULL AND date_text!='')`,
    birth_place: `EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='BIRT' AND place IS NOT NULL AND place!='')`,
    death_place: `EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='DEAT' AND place IS NOT NULL AND place!='')`,
    burial_date: `EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='BURI' AND date_text IS NOT NULL AND date_text!='')`,
    burial_place:`EXISTS (SELECT 1 FROM events WHERE individual_id=i.id AND event_type='BURI' AND place IS NOT NULL AND place!='')`,
    family_count:`(SELECT COUNT(*) FROM family_members WHERE individual_id=i.id) > 0`,
  };
  for (const [col, sql] of Object.entries(BLANK_CONDITIONS)) {
    if (req.query[`hb_${col}`] === '1') conditions.push(sql);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM individuals i ${where}`).get(...params).c;

  const SORT_COLS = {
    surname:    'i.surname COLLATE NOCASE',
    given_name: 'i.given_name COLLATE NOCASE',
    sex:        'i.sex',
    birth_date: '(SELECT date_sort FROM events WHERE individual_id = i.id AND event_type = \'BIRT\' LIMIT 1)',
    death_date: '(SELECT date_sort FROM events WHERE individual_id = i.id AND event_type = \'DEAT\' LIMIT 1)',
    birth_place:'(SELECT place FROM events WHERE individual_id = i.id AND event_type = \'BIRT\' LIMIT 1) COLLATE NOCASE',
    death_place:'(SELECT place FROM events WHERE individual_id = i.id AND event_type = \'DEAT\' LIMIT 1) COLLATE NOCASE',
    burial_date:'(SELECT date_sort FROM events WHERE individual_id = i.id AND event_type = \'BURI\' LIMIT 1)',
    burial_place:'(SELECT place FROM events WHERE individual_id = i.id AND event_type = \'BURI\' LIMIT 1) COLLATE NOCASE',
    family_count:'(SELECT COUNT(*) FROM family_members WHERE individual_id = i.id)',
  };
  const sortCol = SORT_COLS[sortBy] || SORT_COLS.surname;
  const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
  const secondarySort = sortBy === 'surname'
    ? 'i.given_name COLLATE NOCASE ASC'
    : 'i.surname COLLATE NOCASE ASC, i.given_name COLLATE NOCASE ASC';

  const rows = db.prepare(`
    SELECT i.*,
      (SELECT date_text FROM events WHERE individual_id = i.id AND event_type = 'BIRT' LIMIT 1) as birth_date,
      (SELECT place FROM events WHERE individual_id = i.id AND event_type = 'BIRT' LIMIT 1) as birth_place,
      (SELECT date_text FROM events WHERE individual_id = i.id AND event_type = 'DEAT' LIMIT 1) as death_date,
      (SELECT place FROM events WHERE individual_id = i.id AND event_type = 'DEAT' LIMIT 1) as death_place,
      (SELECT date_text FROM events WHERE individual_id = i.id AND event_type = 'BURI' LIMIT 1) as burial_date,
      (SELECT place FROM events WHERE individual_id = i.id AND event_type = 'BURI' LIMIT 1) as burial_place,
      (SELECT COUNT(*) FROM family_members WHERE individual_id = i.id) as family_count
    FROM individuals i
    ${where}
    ORDER BY ${sortCol} ${dir} NULLS LAST, ${secondarySort}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
});

// GET /api/people/surnames — distinct surnames for filter dropdown
router.get('/surnames', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT surname FROM individuals
    WHERE surname IS NOT NULL AND surname != ''
    ORDER BY surname COLLATE NOCASE
  `).all();
  res.json(rows.map(r => r.surname));
});

// GET /api/people/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT * FROM individuals WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Not found' });

  const events = db.prepare(
    'SELECT * FROM events WHERE individual_id = ? ORDER BY date_sort NULLS LAST, id'
  ).all(req.params.id);

  const notes = db.prepare('SELECT * FROM notes WHERE individual_id = ? ORDER BY id').all(req.params.id);

  const citations = db.prepare(`
    SELECT sc.*, s.title, s.author FROM source_citations sc
    LEFT JOIN sources s ON s.id = sc.source_id
    WHERE sc.individual_id = ?
  `).all(req.params.id);

  // Families as spouse
  const spouseFamilies = db.prepare(`
    SELECT f.*,
      (SELECT date_text FROM events WHERE family_id = f.id AND event_type = 'MARR' LIMIT 1) as marr_date,
      (SELECT place FROM events WHERE family_id = f.id AND event_type = 'MARR' LIMIT 1) as marr_place
    FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.individual_id = ? AND fm.role IN ('HUSBAND','WIFE')
  `).all(req.params.id);

  for (const fam of spouseFamilies) {
    fam.children = db.prepare(`
      SELECT i.id, i.given_name, i.surname, i.sex,
        (SELECT date_text FROM events WHERE individual_id = i.id AND event_type = 'BIRT' LIMIT 1) as birth_date
      FROM family_members fm JOIN individuals i ON i.id = fm.individual_id
      WHERE fm.family_id = ? AND fm.role = 'CHILD'
      ORDER BY (SELECT date_sort FROM events WHERE individual_id = i.id AND event_type = 'BIRT' LIMIT 1) NULLS LAST
    `).all(fam.id);
    if (fam.husband_id) fam.husband = db.prepare('SELECT id,given_name,surname FROM individuals WHERE id=?').get(fam.husband_id);
    if (fam.wife_id) fam.wife = db.prepare('SELECT id,given_name,surname FROM individuals WHERE id=?').get(fam.wife_id);
  }

  // Families as child
  const childFamilies = db.prepare(`
    SELECT f.*
    FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.individual_id = ? AND fm.role = 'CHILD'
  `).all(req.params.id);

  for (const fam of childFamilies) {
    if (fam.husband_id) fam.husband = db.prepare('SELECT id,given_name,surname FROM individuals WHERE id=?').get(fam.husband_id);
    if (fam.wife_id) fam.wife = db.prepare('SELECT id,given_name,surname FROM individuals WHERE id=?').get(fam.wife_id);
  }

  res.json({ ...person, events, notes, citations, spouseFamilies, childFamilies });
});

// POST /api/people
router.post('/', (req, res) => {
  const db = getDb();
  const { given_name, surname, name_raw, sex, nickname } = req.body;
  const id = 'I' + Date.now();
  const raw = name_raw || `${given_name} /${surname}/`;
  db.prepare('INSERT INTO individuals (id, given_name, surname, name_raw, sex, nickname) VALUES (?,?,?,?,?,?)')
    .run(id, given_name || '', surname || '', raw, sex || 'U', nickname ?? null);
  const person = db.prepare('SELECT * FROM individuals WHERE id = ?').get(id);
  logActivity({ userId: req.user?.id, username: req.user?.username, action: 'create', entityType: 'person', entityId: id, detail: `Added "${given_name || ''} ${surname || ''}".trim()`, ip: getIp(req) });
  res.status(201).json(person);
});

// PUT /api/people/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { given_name, surname, name_raw, sex, nickname } = req.body;
  db.prepare(`UPDATE individuals SET given_name=?, surname=?, name_raw=?, sex=?, nickname=?, updated_at=datetime('now') WHERE id=?`)
    .run(given_name, surname, name_raw, sex, nickname ?? null, req.params.id);
  const person = db.prepare('SELECT * FROM individuals WHERE id = ?').get(req.params.id);
  logActivity({ userId: req.user?.id, username: req.user?.username, action: 'update', entityType: 'person', entityId: req.params.id, detail: `Updated "${given_name || ''} ${surname || ''}"`, ip: getIp(req) });
  res.json(person);
});

// DELETE /api/people/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT given_name, surname FROM individuals WHERE id = ?').get(req.params.id);
  db.exec('PRAGMA foreign_keys = ON');
  db.prepare('DELETE FROM individuals WHERE id = ?').run(req.params.id);
  logActivity({ userId: req.user?.id, username: req.user?.username, action: 'delete', entityType: 'person', entityId: req.params.id, detail: `Deleted "${person?.given_name || ''} ${person?.surname || ''}"`, ip: getIp(req) });
  res.json({ ok: true });
});

module.exports = router;
