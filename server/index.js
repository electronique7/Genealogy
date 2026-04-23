const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const SqliteStore    = require('./store/SqliteStore');
const { getDb }      = require('./db');
const { requireAuth, requireRole } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.SESSION_SECRET || 'genealogy-dev-secret-change-in-production';

// Initialise DB (creates schema + seeds default admin)
getDb();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use(session({
  store:             new SqliteStore(),
  secret:            SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
  },
}));

// Public: auth endpoints (login/logout/me)
app.use('/api/auth', require('./routes/auth'));

// All remaining /api routes require a valid session
app.use('/api', requireAuth);

// Write operations (POST/PUT/DELETE) require editor or admin
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (!['admin', 'editor'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Editors and admins only' });
    }
  }
  next();
});

app.use('/api/people',   require('./routes/people'));
app.use('/api/families', require('./routes/families'));
app.use('/api/events',   require('./routes/events'));
app.use('/api/sources',  require('./routes/sources'));
app.use('/api/notes',    require('./routes/notes'));
app.use('/api/tree',     require('./routes/tree'));
app.use('/api/admin',    require('./routes/admin'));

app.listen(PORT, () => {
  console.log(`Genealogy API running on http://localhost:${PORT}`);
});
