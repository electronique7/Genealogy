if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express = require('express');
const cors    = require('cors');
const { requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));

app.use('/api', requireAuth);

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

if (require.main === module) {
  app.listen(PORT, () => console.log(`Genealogy API running on http://localhost:${PORT}`));
}

module.exports = app;
