const session = require('express-session');
const { getDb } = require('../db');

class SqliteStore extends session.Store {
  constructor() {
    super();
    // Purge expired sessions every 15 minutes
    setInterval(() => {
      try { getDb().prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now()); }
      catch (_) {}
    }, 15 * 60 * 1000);
  }

  get(sid, cb) {
    try {
      const row = getDb().prepare('SELECT data, expires FROM sessions WHERE sid = ?').get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        getDb().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (e) { cb(e); }
  }

  set(sid, session, cb) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;
      getDb().prepare('INSERT OR REPLACE INTO sessions (sid, data, expires) VALUES (?,?,?)')
        .run(sid, JSON.stringify(session), expires);
      cb(null);
    } catch (e) { cb(e); }
  }

  destroy(sid, cb) {
    try {
      getDb().prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (e) { cb(e); }
  }

  touch(sid, session, cb) { this.set(sid, session, cb); }
}

module.exports = SqliteStore;
