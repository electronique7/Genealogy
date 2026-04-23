const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

async function enrichFamily(db, fam) {
  if (!fam) return null;
  if (fam.husband_id) fam.husband = await db.get('SELECT id,given_name,surname,sex FROM individuals WHERE id=?', fam.husband_id);
  if (fam.wife_id)    fam.wife    = await db.get('SELECT id,given_name,surname,sex FROM individuals WHERE id=?', fam.wife_id);
  fam.children = await db.all(`
    SELECT i.id, i.given_name, i.surname, i.sex,
      (SELECT date_text FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1) as birth_date,
      (SELECT date_sort FROM events WHERE individual_id=i.id AND event_type='BIRT' LIMIT 1) as birth_sort
    FROM family_members fm JOIN individuals i ON i.id=fm.individual_id
    WHERE fm.family_id=? AND fm.role='CHILD'
    ORDER BY birth_sort NULLS LAST
  `, fam.id);
  fam.events = await db.all('SELECT * FROM events WHERE family_id=? ORDER BY date_sort NULLS LAST', fam.id);
  return fam;
}

router.get('/', async (req, res) => {
  const db = getDb();
  const { individual_id } = req.query;
  let rows;
  if (individual_id) {
    rows = await db.all(`SELECT f.* FROM families f JOIN family_members fm ON fm.family_id=f.id WHERE fm.individual_id=?`, individual_id);
  } else {
    rows = await db.all('SELECT * FROM families ORDER BY id LIMIT 100');
  }
  res.json(await Promise.all(rows.map(f => enrichFamily(db, f))));
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const fam = await db.get('SELECT * FROM families WHERE id=?', req.params.id);
  if (!fam) return res.status(404).json({ error: 'Not found' });
  res.json(await enrichFamily(db, fam));
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { husband_id, wife_id } = req.body;
  const id = 'F' + Date.now();
  await db.run('INSERT INTO families (id,husband_id,wife_id) VALUES (?,?,?)', id, husband_id || null, wife_id || null);
  if (husband_id) await db.run('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)', id, husband_id, 'HUSBAND');
  if (wife_id)    await db.run('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)', id, wife_id, 'WIFE');
  const fam = await db.get('SELECT * FROM families WHERE id=?', id);
  res.status(201).json(await enrichFamily(db, fam));
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  const { husband_id, wife_id } = req.body;
  const fam = await db.get('SELECT * FROM families WHERE id=?', req.params.id);
  if (!fam) return res.status(404).json({ error: 'Not found' });

  await db.run(`UPDATE families SET husband_id=?,wife_id=?,updated_at=datetime('now') WHERE id=?`, husband_id || null, wife_id || null, req.params.id);
  await db.run('DELETE FROM family_members WHERE family_id=? AND role IN (?,?)', req.params.id, 'HUSBAND', 'WIFE');
  if (husband_id) await db.run('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)', req.params.id, husband_id, 'HUSBAND');
  if (wife_id)    await db.run('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)', req.params.id, wife_id, 'WIFE');

  res.json(await enrichFamily(db, await db.get('SELECT * FROM families WHERE id=?', req.params.id)));
});

router.delete('/:id', async (req, res) => {
  await getDb().run('DELETE FROM families WHERE id=?', req.params.id);
  res.json({ ok: true });
});

router.post('/:id/children', async (req, res) => {
  await getDb().run('INSERT OR IGNORE INTO family_members (family_id,individual_id,role) VALUES (?,?,?)', req.params.id, req.body.individual_id, 'CHILD');
  res.json({ ok: true });
});

router.delete('/:id/children/:personId', async (req, res) => {
  await getDb().run('DELETE FROM family_members WHERE family_id=? AND individual_id=? AND role=?', req.params.id, req.params.personId, 'CHILD');
  res.json({ ok: true });
});

module.exports = router;
