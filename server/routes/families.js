const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function enrichFamily(db, fam) {
  if (!fam) return null;
  if (fam.husband_id) fam.husband = db.prepare('SELECT id,given_name,surname,sex FROM individuals WHERE id=?').get(fam.husband_id);
  if (fam.wife_id) fam.wife = db.prepare('SELECT id,given_name,surname,sex FROM individuals WHERE id=?').get(fam.wife_id);
  fam.children = db.prepare(`
    SELECT i.id, i.given_name, i.surname, i.sex,
      (SELECT date_text FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1) as birth_date,
      (SELECT date_sort FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1) as birth_sort
    FROM family_members fm JOIN individuals i ON i.id=fm.individual_id
    WHERE fm.family_id=? AND fm.role='CHILD'
    ORDER BY birth_sort NULLS LAST
  `).all(fam.id);
  fam.events = db.prepare('SELECT * FROM events WHERE family_id=? ORDER BY date_sort NULLS LAST').all(fam.id);
  return fam;
}

// GET /api/families?individual_id=
router.get('/', (req, res) => {
  const db = getDb();
  const { individual_id } = req.query;
  let rows;
  if (individual_id) {
    rows = db.prepare(`
      SELECT f.* FROM families f
      JOIN family_members fm ON fm.family_id=f.id
      WHERE fm.individual_id=?
    `).all(individual_id);
  } else {
    rows = db.prepare('SELECT * FROM families ORDER BY id LIMIT 100').all();
  }
  res.json(rows.map(f => enrichFamily(db, f)));
});

// GET /api/families/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const fam = db.prepare('SELECT * FROM families WHERE id=?').get(req.params.id);
  if (!fam) return res.status(404).json({ error: 'Not found' });
  res.json(enrichFamily(db, fam));
});

// POST /api/families
router.post('/', (req, res) => {
  const db = getDb();
  const { husband_id, wife_id } = req.body;
  const id = 'F' + Date.now();
  db.prepare('INSERT INTO families (id,husband_id,wife_id) VALUES (?,?,?)').run(id, husband_id || null, wife_id || null);
  if (husband_id) db.prepare('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)').run(id, husband_id, 'HUSBAND');
  if (wife_id) db.prepare('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)').run(id, wife_id, 'WIFE');
  const fam = db.prepare('SELECT * FROM families WHERE id=?').get(id);
  res.status(201).json(enrichFamily(db, fam));
});

// PUT /api/families/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { husband_id, wife_id } = req.body;
  const fam = db.prepare('SELECT * FROM families WHERE id=?').get(req.params.id);
  if (!fam) return res.status(404).json({ error: 'Not found' });

  db.prepare(`UPDATE families SET husband_id=?,wife_id=?,updated_at=datetime('now') WHERE id=?`).run(husband_id || null, wife_id || null, req.params.id);

  // Sync family_members
  db.prepare('DELETE FROM family_members WHERE family_id=? AND role IN (?,?)').run(req.params.id, 'HUSBAND', 'WIFE');
  if (husband_id) db.prepare('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)').run(req.params.id, husband_id, 'HUSBAND');
  if (wife_id) db.prepare('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)').run(req.params.id, wife_id, 'WIFE');

  res.json(enrichFamily(db, db.prepare('SELECT * FROM families WHERE id=?').get(req.params.id)));
});

// DELETE /api/families/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM families WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/families/:id/children
router.post('/:id/children', (req, res) => {
  const db = getDb();
  const { individual_id } = req.body;
  db.prepare('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)').run(req.params.id, individual_id, 'CHILD');
  res.json({ ok: true });
});

// DELETE /api/families/:id/children/:personId
router.delete('/:id/children/:personId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM family_members WHERE family_id=? AND individual_id=? AND role=?').run(req.params.id, req.params.personId, 'CHILD');
  res.json({ ok: true });
});

module.exports = router;
