const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');

router.get('/activity', ...requireRole('admin'), async (req, res) => {
  const db = getDb();
  const { page = 1, limit = 50, user = '', action = '', entity = '', from = '', to = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];
  if (user)   { conditions.push(`lower(username) LIKE lower(?)`); params.push(`%${user}%`); }
  if (action) { conditions.push(`action = ?`);                    params.push(action); }
  if (entity) { conditions.push(`entity_type = ?`);               params.push(entity); }
  if (from)   { conditions.push(`created_at >= ?`);               params.push(from); }
  if (to)     { conditions.push(`created_at <= ?`);               params.push(to + ' 23:59:59'); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = await db.get(`SELECT COUNT(*) as c FROM activity_log ${where}`, ...params);
  const rows     = await db.all(`SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...params, parseInt(limit), offset);

  res.json({ total: Number(totalRow.c), page: parseInt(page), data: rows });
});

router.get('/activity/summary', ...requireRole('admin'), async (req, res) => {
  const db = getDb();
  const today   = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  const [lt, lw, reg, ew, tu, au] = await Promise.all([
    db.get(`SELECT COUNT(*) as c FROM activity_log WHERE action='login' AND created_at >= ?`, today),
    db.get(`SELECT COUNT(*) as c FROM activity_log WHERE action='login' AND created_at >= ?`, weekAgo),
    db.get(`SELECT COUNT(*) as c FROM activity_log WHERE action='register'`),
    db.get(`SELECT COUNT(*) as c FROM activity_log WHERE action IN ('create','update','delete') AND created_at >= ?`, weekAgo),
    db.get(`SELECT COUNT(*) as c FROM users WHERE active=1`),
    db.get(`SELECT COUNT(DISTINCT user_id) as c FROM activity_log WHERE action='login' AND created_at >= ?`, weekAgo),
  ]);

  res.json({
    loginsToday:   Number(lt.c),
    loginsWeek:    Number(lw.c),
    registrations: Number(reg.c),
    editsWeek:     Number(ew.c),
    totalUsers:    Number(tu.c),
    activeUsers:   Number(au.c),
  });
});

router.get('/activity/users', ...requireRole('admin'), async (req, res) => {
  const rows = await getDb().all(`
    SELECT
      u.id, u.username, u.email, u.role, u.active,
      COUNT(CASE WHEN a.action='login' THEN 1 END)  AS login_count,
      COUNT(CASE WHEN a.action IN ('create','update','delete') THEN 1 END) AS edit_count,
      MAX(CASE WHEN a.action='login' THEN a.created_at END) AS last_login,
      u.created_at AS registered_at
    FROM users u
    LEFT JOIN activity_log a ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY last_login DESC NULLS LAST
  `);
  res.json(rows);
});

module.exports = router;
