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

      db.prepare(
        `INSERT INTO users (id, email, name, picture)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, picture=excluded.picture`
      ).run(profile.id, email, name, picture || null);

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
  (_req, res) => res.redirect(`${CLIENT_URL}?login=success`)
);

app.get('/auth/me', (req, res) => {
  if (req.user) {
    const { id, email, name, picture } = req.user as User;
    res.json({ id, email, name, picture });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
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
