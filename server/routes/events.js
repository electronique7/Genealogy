const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const MONTHS = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };

function parseDateSort(dateText) {
  if (!dateText) return null;
  const clean = dateText.replace(/^(ABT|BEF|AFT|EST|CAL|BET)\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 3) {
    const [day, mon, year] = parts;
    const month = MONTHS[mon.toUpperCase()] || '00';
    return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  if (parts.length === 2) {
    const month = MONTHS[parts[0].toUpperCase()];
    if (month) return `${parts[1]}-${month}-00`;
    return `${parts[0]}-00-00`;
  }
  if (parts.length === 1 && /^\d{3,4}$/.test(parts[0])) return `${parts[0]}-00-00`;
  return null;
}

// GET /api/events?individual_id=&family_id=
router.get('/', (req, res) => {
  const db = getDb();
  const { individual_id, family_id } = req.query;
  if (individual_id) {
    return res.json(db.prepare('SELECT * FROM events WHERE individual_id=? ORDER BY date_sort NULLS LAST').all(individual_id));
  }
  if (family_id) {
    return res.json(db.prepare('SELECT * FROM events WHERE family_id=? ORDER BY date_sort NULLS LAST').all(family_id));
  }
  res.json([]);
});

// POST /api/events
router.post('/', (req, res) => {
  const db = getDb();
  const { individual_id, family_id, event_type, date_text, place, note } = req.body;
  const date_sort = parseDateSort(date_text);
  const result = db.prepare(
    'INSERT INTO events (individual_id,family_id,event_type,date_text,date_sort,place,note) VALUES (?,?,?,?,?,?,?)'
  ).run(individual_id || null, family_id || null, event_type, date_text || null, date_sort, place || null, note || null);
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(ev);
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { event_type, date_text, place, note } = req.body;
  const date_sort = parseDateSort(date_text);
  db.prepare('UPDATE events SET event_type=?,date_text=?,date_sort=?,place=?,note=? WHERE id=?')
    .run(event_type, date_text || null, date_sort, place || null, note || null, req.params.id);
  res.json(db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id));
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
