import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return next(createError(400, 'Email, password, and name are required.', 'MISSING_FIELDS'));
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      return next(createError(400, error.message, 'SIGNUP_ERROR'));
    }

    // Store profile in users table
    await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      name,
    });

    // Generate session token
    const { data: session, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      return next(createError(500, 'Account created but login failed. Please log in manually.', 'SESSION_ERROR'));
    }

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
      },
      token: session.session.access_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createError(400, 'Email and password are required.', 'MISSING_FIELDS'));
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return next(createError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS'));
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Login successful.',
      user: profile || { id: data.user.id, email: data.user.email },
      token: data.session.access_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await supabase.auth.admin.signOut(token);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next(createError(401, 'Not authenticated.', 'UNAUTHORIZED'));

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return next(createError(401, 'Invalid token.', 'INVALID_TOKEN'));

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({ user: profile || { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

export default router;
