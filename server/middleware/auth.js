// Require a valid session; attaches req.user
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = {
    id:       req.session.userId,
    username: req.session.username,
    role:     req.session.role,
  };
  next();
}

// Require one of the listed roles (always implies requireAuth first)
function requireRole(...roles) {
  return [
    requireAuth,
    (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    },
  ];
}

module.exports = { requireAuth, requireRole };
