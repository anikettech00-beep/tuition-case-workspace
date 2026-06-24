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

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [PARENT, TUTOR]
 *     responses:
 *       '201':
 *         description: Created user and session token
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Authenticated user and session token
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out current user (clear session cookie)
 *     tags:
 *       - Auth
 *     responses:
 *       '200':
 *         description: Logged out
 */
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out' });
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       '401':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

/**
 * @openapi
 * /api/auth/forgot:
 *   post:
 *     summary: Request a password reset link
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: Password reset email queued (always returns success)
 */
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

/**
 * @openapi
 * /api/auth/reset:
 *   post:
 *     summary: Reset password using token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Password reset successful
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
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
