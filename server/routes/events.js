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

router.get('/', async (req, res) => {
  const db = getDb();
  const { individual_id, family_id } = req.query;
  if (individual_id) {
    return res.json(await db.all('SELECT * FROM events WHERE individual_id=? ORDER BY date_sort NULLS LAST', individual_id));
  }
  if (family_id) {
    return res.json(await db.all('SELECT * FROM events WHERE family_id=? ORDER BY date_sort NULLS LAST', family_id));
  }
  res.json([]);
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { individual_id, family_id, event_type, date_text, place, note } = req.body;
  const date_sort = parseDateSort(date_text);
  const result = await db.run(
    'INSERT INTO events (individual_id,family_id,event_type,date_text,date_sort,place,note) VALUES (?,?,?,?,?,?,?)',
    individual_id || null, family_id || null, event_type, date_text || null, date_sort, place || null, note || null
  );
  res.status(201).json(await db.get('SELECT * FROM events WHERE id=?', result.lastInsertRowid));
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  const { event_type, date_text, place, note } = req.body;
  const date_sort = parseDateSort(date_text);
  await db.run('UPDATE events SET event_type=?,date_text=?,date_sort=?,place=?,note=? WHERE id=?',
    event_type, date_text || null, date_sort, place || null, note || null, req.params.id);
  res.json(await db.get('SELECT * FROM events WHERE id=?', req.params.id));
});

router.delete('/:id', async (req, res) => {
  await getDb().run('DELETE FROM events WHERE id=?', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
