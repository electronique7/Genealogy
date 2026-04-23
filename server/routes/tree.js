const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

async function getPersonNode(db, id) {
  const p = await db.get('SELECT id,given_name,surname,sex FROM individuals WHERE id=?', id);
  if (!p) return null;
  const birth = await db.get('SELECT date_text FROM events WHERE individual_id=? AND event_type=? LIMIT 1', id, 'BIRT');
  const death = await db.get('SELECT date_text FROM events WHERE individual_id=? AND event_type=? LIMIT 1', id, 'DEAT');
  return {
    name: `${p.given_name || ''} ${p.surname || ''}`.trim() || 'Unknown',
    attributes: {
      id: p.id,
      sex: p.sex,
      givenName: p.given_name || '',
      surname: p.surname || '',
      birth: birth ? birth.date_text : null,
      death: death ? death.date_text : null,
    },
    children: [],
  };
}

async function buildAncestorTree(db, personId, maxDepth) {
  const root = await getPersonNode(db, personId);
  if (!root) return null;

  async function addParents(node, depth) {
    if (depth >= maxDepth) return;
    const id = node.attributes.id;
    const childFamily = await db.get(`
      SELECT f.husband_id, f.wife_id FROM families f
      JOIN family_members fm ON fm.family_id = f.id
      WHERE fm.individual_id = ? AND fm.role = 'CHILD'
      LIMIT 1
    `, id);
    if (!childFamily) return;
    if (childFamily.husband_id) {
      const father = await getPersonNode(db, childFamily.husband_id);
      if (father) { await addParents(father, depth + 1); node.children.push(father); }
    }
    if (childFamily.wife_id) {
      const mother = await getPersonNode(db, childFamily.wife_id);
      if (mother) { await addParents(mother, depth + 1); node.children.push(mother); }
    }
  }

  await addParents(root, 0);
  return root;
}

async function buildDescendantTree(db, personId, maxDepth, visited = new Set()) {
  if (visited.has(personId)) return null;
  visited.add(personId);

  const root = await getPersonNode(db, personId);
  if (!root) return null;
  if (maxDepth <= 0) return root;

  const spouseFamilies = await db.all(`
    SELECT f.id, f.husband_id, f.wife_id FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.individual_id = ? AND fm.role IN ('HUSBAND','WIFE')
  `, personId);

  for (const fam of spouseFamilies) {
    const children = await db.all(`SELECT individual_id FROM family_members WHERE family_id = ? AND role = 'CHILD'`, fam.id);
    for (const child of children) {
      const childNode = await buildDescendantTree(db, child.individual_id, maxDepth - 1, visited);
      if (childNode) {
        const spouseId = fam.husband_id === personId ? fam.wife_id : fam.husband_id;
        if (spouseId && !childNode.attributes.otherParentName) {
          const spouse = await db.get('SELECT given_name,surname FROM individuals WHERE id=?', spouseId);
          if (spouse) childNode.attributes.otherParentSurname = spouse.surname;
        }
        root.children.push(childNode);
      }
    }
  }
  return root;
}

router.get('/ancestors/:id', async (req, res) => {
  const db = getDb();
  const generations = Math.min(parseInt(req.query.generations) || 8, 15);
  const tree = await buildAncestorTree(db, req.params.id, generations);
  if (!tree) return res.status(404).json({ error: 'Person not found' });
  res.json(tree);
});

router.get('/descendants/:id', async (req, res) => {
  const db = getDb();
  const generations = Math.min(parseInt(req.query.generations) || 5, 15);
  const tree = await buildDescendantTree(db, req.params.id, generations);
  if (!tree) return res.status(404).json({ error: 'Person not found' });
  res.json(tree);
});

router.get('/search', async (req, res) => {
  const db = getDb();
  const q = req.query.q || '';
  if (!q) return res.json([]);
  const rows = await db.all(`
    SELECT id, given_name, surname, sex,
      (SELECT date_text FROM events WHERE individual_id=id AND event_type='BIRT' LIMIT 1) as birth_date
    FROM individuals
    WHERE lower(given_name || ' ' || surname) LIKE lower(?)
    ORDER BY surname, given_name
    LIMIT 20
  `, `%${q}%`);
  res.json(rows);
});

module.exports = router;
