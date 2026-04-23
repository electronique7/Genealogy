const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.post('/', async (req, res) => {
  const db = getDb();
  const { individual_id, family_id, content } = req.body;
  const result = await db.run('INSERT INTO notes (individual_id,family_id,content) VALUES (?,?,?)', individual_id || null, family_id || null, content);
  res.status(201).json(await db.get('SELECT * FROM notes WHERE id=?', result.lastInsertRowid));
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  await db.run('UPDATE notes SET content=? WHERE id=?', req.body.content, req.params.id);
  res.json(await db.get('SELECT * FROM notes WHERE id=?', req.params.id));
});

router.delete('/:id', async (req, res) => {
  await getDb().run('DELETE FROM notes WHERE id=?', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
