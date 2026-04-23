const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  res.json(await getDb().all('SELECT * FROM sources ORDER BY title'));
});

router.get('/:id', async (req, res) => {
  const src = await getDb().get('SELECT * FROM sources WHERE id=?', req.params.id);
  if (!src) return res.status(404).json({ error: 'Not found' });
  res.json(src);
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { title, author, publication, text, ref_number, type } = req.body;
  const id = 'S' + Date.now();
  await db.run('INSERT INTO sources (id,title,author,publication,text,ref_number,type) VALUES (?,?,?,?,?,?,?)', id, title, author, publication, text, ref_number, type);
  res.status(201).json(await db.get('SELECT * FROM sources WHERE id=?', id));
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  const { title, author, publication, text, ref_number, type } = req.body;
  await db.run('UPDATE sources SET title=?,author=?,publication=?,text=?,ref_number=?,type=? WHERE id=?', title, author, publication, text, ref_number, type, req.params.id);
  res.json(await db.get('SELECT * FROM sources WHERE id=?', req.params.id));
});

module.exports = router;
