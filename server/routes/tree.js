const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function getPersonNode(db, id) {
  const p = db.prepare('SELECT id,given_name,surname,sex FROM individuals WHERE id=?').get(id);
  if (!p) return null;
  const birth = db.prepare('SELECT date_text FROM events WHERE individual_id=? AND event_type=? LIMIT 1').get(id, 'BIRT');
  const death = db.prepare('SELECT date_text FROM events WHERE individual_id=? AND event_type=? LIMIT 1').get(id, 'DEAT');
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
    children: []
  };
}

// Build ancestor tree recursively (iterative BFS for safety)
function buildAncestorTree(db, personId, maxDepth) {
  const root = getPersonNode(db, personId);
  if (!root) return null;

  function addParents(node, depth) {
    if (depth >= maxDepth) return;
    const id = node.attributes.id;
    // Find the family where this person is a child
    const childFamily = db.prepare(`
      SELECT f.husband_id, f.wife_id FROM families f
      JOIN family_members fm ON fm.family_id = f.id
      WHERE fm.individual_id = ? AND fm.role = 'CHILD'
      LIMIT 1
    `).get(id);
    if (!childFamily) return;

    if (childFamily.husband_id) {
      const father = getPersonNode(db, childFamily.husband_id);
      if (father) {
        addParents(father, depth + 1);
        node.children.push(father);
      }
    }
    if (childFamily.wife_id) {
      const mother = getPersonNode(db, childFamily.wife_id);
      if (mother) {
        addParents(mother, depth + 1);
        node.children.push(mother);
      }
    }
  }

  addParents(root, 0);
  return root;
}

// Build descendant tree recursively
function buildDescendantTree(db, personId, maxDepth, visited = new Set()) {
  if (visited.has(personId)) return null;
  visited.add(personId);

  const root = getPersonNode(db, personId);
  if (!root) return null;
  if (maxDepth <= 0) return root;

  // Find all families where this person is a spouse
  const spouseFamilies = db.prepare(`
    SELECT f.id, f.husband_id, f.wife_id FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.individual_id = ? AND fm.role IN ('HUSBAND','WIFE')
  `).all(personId);

  for (const fam of spouseFamilies) {
    const children = db.prepare(`
      SELECT individual_id FROM family_members
      WHERE family_id = ? AND role = 'CHILD'
    `).all(fam.id);

    for (const child of children) {
      const childNode = buildDescendantTree(db, child.individual_id, maxDepth - 1, visited);
      if (childNode) {
        // Find spouse info for display
        const spouseId = fam.husband_id === personId ? fam.wife_id : fam.husband_id;
        if (spouseId && !childNode.attributes.otherParentName) {
          const spouse = db.prepare('SELECT given_name,surname FROM individuals WHERE id=?').get(spouseId);
          if (spouse) childNode.attributes.otherParentSurname = spouse.surname;
        }
        root.children.push(childNode);
      }
    }
  }

  return root;
}

// GET /api/tree/ancestors/:id?generations=8
router.get('/ancestors/:id', (req, res) => {
  const db = getDb();
  const generations = Math.min(parseInt(req.query.generations) || 8, 15);
  const tree = buildAncestorTree(db, req.params.id, generations);
  if (!tree) return res.status(404).json({ error: 'Person not found' });
  res.json(tree);
});

// GET /api/tree/descendants/:id?generations=5
router.get('/descendants/:id', (req, res) => {
  const db = getDb();
  const generations = Math.min(parseInt(req.query.generations) || 5, 15);
  const tree = buildDescendantTree(db, req.params.id, generations);
  if (!tree) return res.status(404).json({ error: 'Person not found' });
  res.json(tree);
});

// GET /api/tree/search?q= — quick search for tree navigation
router.get('/search', (req, res) => {
  const db = getDb();
  const q = req.query.q || '';
  if (!q) return res.json([]);
  const rows = db.prepare(`
    SELECT id, given_name, surname, sex,
      (SELECT date_text FROM events WHERE individual_id=id AND event_type='BIRT' LIMIT 1) as birth_date
    FROM individuals
    WHERE lower(given_name || ' ' || surname) LIKE lower(?)
    ORDER BY surname COLLATE NOCASE, given_name COLLATE NOCASE
    LIMIT 20
  `).all(`%${q}%`);
  res.json(rows);
});

module.exports = router;
