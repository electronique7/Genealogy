const { getDb } = require('../db');

async function logActivity({ userId = null, username = null, action, entityType = null, entityId = null, detail = null, ip = null }) {
  try {
    await getDb().run(
      `INSERT INTO activity_log (user_id, username, action, entity_type, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)`,
      userId, username, action, entityType, entityId, detail, ip
    );
  } catch (_) {}
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

module.exports = { logActivity, getIp };
