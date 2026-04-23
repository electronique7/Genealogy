const { getDb } = require('../db');

/**
 * Write one entry to activity_log.
 * @param {object} opts
 * @param {number|null} opts.userId
 * @param {string|null} opts.username
 * @param {string}      opts.action      — e.g. 'login', 'register', 'create', 'update', 'delete'
 * @param {string}      [opts.entityType] — e.g. 'person', 'family', 'event', 'note', 'user'
 * @param {string}      [opts.entityId]
 * @param {string}      [opts.detail]    — human-readable summary
 * @param {string}      [opts.ip]
 */
function logActivity({ userId = null, username = null, action, entityType = null, entityId = null, detail = null, ip = null }) {
  try {
    getDb().prepare(`
      INSERT INTO activity_log (user_id, username, action, entity_type, entity_id, detail, ip)
      VALUES (?,?,?,?,?,?,?)
    `).run(userId, username, action, entityType, entityId, detail, ip);
  } catch (_) {
    // Never let a logging failure crash the request
  }
}

/** Pull client IP from Express request, respecting common proxy headers. */
function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

module.exports = { logActivity, getIp };
