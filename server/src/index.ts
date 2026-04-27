import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import db from './db';
import tasksRouter from './routes/tasks';
import { startScheduler } from './scheduler';
import { User } from './types';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

app.set('trust proxy', 1);
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const picture = profile.photos?.[0]?.value;

      if (!email) return done(new Error('No email from Google'));

      // Auto-approve if this is the admin email
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL;

      db.prepare(
        `INSERT INTO users (id, email, name, picture, approved)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, picture=excluded.picture,
           approved=CASE WHEN excluded.approved=1 THEN 1 ELSE users.approved END`
      ).run(profile.id, email, name, picture || null, isAdmin ? 1 : 0);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(profile.id) as unknown as User;
      done(null, user);
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id: string, done) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown;
  done(null, user || false);
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}?error=auth` }),
  (req, res) => {
    const user = req.user as User;
    if (!user.approved) {
      return res.redirect(`${CLIENT_URL}?pending=true`);
    }
    res.redirect(`${CLIENT_URL}?login=success`);
  }
);

app.get('/auth/me', (req, res) => {
  if (req.user) {
    const user = req.user as User;
    if (!user.approved) {
      return res.status(403).json({ error: 'pending' });
    }
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL;
    res.json({ id: user.id, email: user.email, name: user.name, picture: user.picture, is_admin: isAdmin });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// ── Admin routes ──────────────────────────────────────────────
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.user as User;
  if (user.email.toLowerCase() !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// List all users (admin)
app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db.prepare(
    `SELECT id, email, name, picture, approved, created_at FROM users ORDER BY approved ASC, created_at DESC`
  ).all();
  res.json(users);
});

// Approve a user (admin)
app.post('/api/admin/approve/:userId', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(req.params.userId);
  res.json({ success: true });
});

// Revoke a user (admin)
app.post('/api/admin/revoke/:userId', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.params.userId) as any;
  if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
    return res.status(400).json({ error: 'Cannot revoke admin' });
  }
  db.prepare('UPDATE users SET approved = 0 WHERE id = ?').run(req.params.userId);
  res.json({ success: true });
});

// List approved users (for task assignment dropdown)
app.get('/api/users', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const me = (req.user as User).id;
  const users = db.prepare(
    `SELECT id, name, email, picture FROM users WHERE approved = 1 AND id != ? ORDER BY name`
  ).all(me);
  res.json(users);
});

app.use('/api/tasks', tasksRouter);

// Serve React app in production
const clientBuild = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

startScheduler();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
