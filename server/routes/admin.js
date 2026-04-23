const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET /api/admin/activity?page=1&limit=50&user=&action=&entity=&from=&to=
router.get('/activity', ...requireRole('admin'), (req, res) => {
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

  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_log ${where}`).get(...params).c;
  const rows  = db.prepare(`
    SELECT * FROM activity_log ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ total, page: parseInt(page), data: rows });
});

// GET /api/admin/activity/summary  — counts for dashboard cards
router.get('/activity/summary', ...requireRole('admin'), (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  res.json({
    loginsToday:    db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE action='login' AND created_at >= ?`).get(today).c,
    loginsWeek:     db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE action='login' AND created_at >= ?`).get(weekAgo).c,
    registrations:  db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE action='register'`).get().c,
    editsWeek:      db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE action IN ('create','update','delete') AND created_at >= ?`).get(weekAgo).c,
    totalUsers:     db.prepare(`SELECT COUNT(*) as c FROM users WHERE active=1`).get().c,
    activeUsers:    db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM activity_log WHERE action='login' AND created_at >= ?`).get(weekAgo).c,
  });
});

// GET /api/admin/activity/users  — per-user activity summary
router.get('/activity/users', ...requireRole('admin'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
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
  `).all();
  res.json(rows);
});

module.exports = router;
