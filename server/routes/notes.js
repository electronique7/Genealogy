const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.post('/', (req, res) => {
  const db = getDb();
  const { individual_id, family_id, content } = req.body;
  const result = db.prepare('INSERT INTO notes (individual_id,family_id,content) VALUES (?,?,?)').run(individual_id || null, family_id || null, content);
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id=?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notes SET content=? WHERE id=?').run(req.body.content, req.params.id);
  res.json(db.prepare('SELECT * FROM notes WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM notes WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
