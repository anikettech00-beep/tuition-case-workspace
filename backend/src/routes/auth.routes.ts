import { Router, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { AuthRequest, COOKIE_NAME, requireAuth } from '../middleware/auth';
import { getCookieOptions, loginUser, registerUser, createPasswordResetToken, resetPassword } from '../services/auth.service';
import { env } from '../config/env';

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum([Role.PARENT, Role.TUTOR]),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

//To create a user
router.post('/register', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const { user, token } = await registerUser(input);
    res.cookie(COOKIE_NAME, token, getCookieOptions());
    res.status(201).json({ user, token });
  } catch (e) {
    next(e);
  }
});

//For user login
router.post('/login', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const { user, token } = await loginUser(input.email, input.password);
    res.cookie(COOKIE_NAME, token, getCookieOptions());
    res.json({ user, token });
  } catch (e) {
    next(e);
  }
});

//Logged out current user
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out' });
});

//    summary: Get current authenticated user
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Send a password reset link to the user's email
router.post('/forgot', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = z.object({ email: z.string().trim().email() }).parse(req.body);
    await createPasswordResetToken(input.email);
    // Always return success to avoid revealing whether email exists
    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (e) {
    next(e);
  }
});

// Reset the user's password
router.post('/reset', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = resetSchema.parse(req.body);
    await resetPassword(input.token, input.password);
    res.json({ message: 'Password has been reset' });
  } catch (e) {
    next(e);
  }
});

export default router;
