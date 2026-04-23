const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM sources ORDER BY title').all());
});

router.get('/:id', (req, res) => {
  const src = getDb().prepare('SELECT * FROM sources WHERE id=?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Not found' });
  res.json(src);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { title, author, publication, text, ref_number, type } = req.body;
  const id = 'S' + Date.now();
  db.prepare('INSERT INTO sources (id,title,author,publication,text,ref_number,type) VALUES (?,?,?,?,?,?,?)').run(id, title, author, publication, text, ref_number, type);
  res.status(201).json(db.prepare('SELECT * FROM sources WHERE id=?').get(id));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { title, author, publication, text, ref_number, type } = req.body;
  db.prepare('UPDATE sources SET title=?,author=?,publication=?,text=?,ref_number=?,type=? WHERE id=?').run(title, author, publication, text, ref_number, type, req.params.id);
  res.json(db.prepare('SELECT * FROM sources WHERE id=?').get(req.params.id));
});

module.exports = router;
