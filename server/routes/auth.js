const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity, getIp } = require('../lib/log');

// POST /api/auth/register  — public, self-service; new accounts start as viewer
router.post('/register', (req, res) => {
  const { username, email = '', password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db   = getDb();
  const role = db.prepare('SELECT id FROM users LIMIT 1').get() ? 'viewer' : 'admin';
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)').run(username, email, hash, role);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    logActivity({ userId: user.id, username: user.username, action: 'register', entityType: 'user', entityId: String(user.id), detail: `Self-registered as ${role}`, ip: getIp(req) });
    res.status(201).json({ id: user.id, username: user.username, role: user.role, email: user.email });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    throw e;
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logActivity({ username, action: 'login_failed', entityType: 'user', detail: 'Invalid credentials', ip: getIp(req) });
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.role     = user.role;
  logActivity({ userId: user.id, username: user.username, action: 'login', entityType: 'user', entityId: String(user.id), ip: getIp(req) });
  res.json({ id: user.id, username: user.username, role: user.role, email: user.email });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  logActivity({ userId: req.user.id, username: req.user.username, action: 'logout', ip: getIp(req) });
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = getDb().prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── User management (admin only) ─────────────────────────────────────────────

// GET /api/auth/users
router.get('/users', ...requireRole('admin'), (req, res) => {
  const rows = getDb().prepare(
    'SELECT id, username, email, role, active, created_at FROM users ORDER BY username COLLATE NOCASE'
  ).all();
  res.json(rows);
});

// POST /api/auth/users  — admin creates a user directly
router.post('/users', ...requireRole('admin'), (req, res) => {
  const { username, email = '', password, role = 'viewer' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (!['admin', 'editor', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    getDb().prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)').run(username, email, hash, role);
    const user = getDb().prepare('SELECT id, username, email, role, active FROM users WHERE username = ?').get(username);
    logActivity({ userId: req.user.id, username: req.user.username, action: 'create', entityType: 'user', entityId: String(user.id), detail: `Created user "${username}" as ${role}`, ip: getIp(req) });
    res.status(201).json(user);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    throw e;
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', ...requireRole('admin'), (req, res) => {
  const db = getDb();
  const { email, role, active, password } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (role && !['admin', 'editor', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const changes = [];
  if (role   && role   !== existing.role)   changes.push(`role → ${role}`);
  if (active != null   && active !== existing.active) changes.push(active ? 'activated' : 'disabled');
  if (password) changes.push('password reset');

  const newHash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;
  db.prepare(`UPDATE users SET email=?, role=?, active=?, password_hash=?, updated_at=datetime('now') WHERE id=?`)
    .run(email ?? existing.email, role ?? existing.role, active ?? existing.active, newHash, req.params.id);

  if (changes.length) {
    logActivity({ userId: req.user.id, username: req.user.username, action: 'update', entityType: 'user', entityId: req.params.id, detail: `Updated "${existing.username}": ${changes.join(', ')}`, ip: getIp(req) });
  }
  const updated = db.prepare('SELECT id, username, email, role, active FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', ...requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const target = getDb().prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
  getDb().prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logActivity({ userId: req.user.id, username: req.user.username, action: 'delete', entityType: 'user', entityId: req.params.id, detail: `Deleted user "${target?.username}"`, ip: getIp(req) });
  res.json({ ok: true });
});

// PUT /api/auth/me/password
router.put('/me/password', requireAuth, (req, res) => {
  const { current, next: newPassword } = req.body;
  if (!current || !newPassword) return res.status(400).json({ error: 'current and next passwords required' });
  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current, user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = bcrypt.hashSync(newPassword, 10);
  getDb().prepare(`UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?`).run(hash, req.user.id);
  logActivity({ userId: req.user.id, username: req.user.username, action: 'password_change', entityType: 'user', entityId: String(req.user.id), ip: getIp(req) });
  res.json({ ok: true });
});

module.exports = router;
