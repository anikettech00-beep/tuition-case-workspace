import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../middleware/auth';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SALT_ROUNDS = 12;

async function sendResetEmail(to: string, link: string) {
  if (env.NODE_ENV === 'production' && 
      (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM)) {
    console.warn('SMTP not fully configured, skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: false,                    // MUST be false for port 587
    requireTLS: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 120000,
    debug: true,
    logger: true,
  });

  const from = env.SMTP_FROM || `no-reply@${new URL(env.FRONTEND_URL).hostname}`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Reset your TuitionCase password',
      text: `Reset your password: ${link}\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <p><a href="${link}" style="color: #6366f1; font-size: 18px;">Reset My Password</a></p>
          <p style="color: #666;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
  } catch (err: any) {
    console.error('❌ SMTP Error:', err.code, err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('Connection timeout - Check Railway outbound connection or firewall');
    }
    throw new AppError(502, 'Failed to send password reset email', 'EMAIL_SEND_FAILED');
  }
}
export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return { user, token: signToken(user.id) };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role } satisfies AuthUser,
    token: signToken(user.id),
  };
}

export async function createPasswordResetToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return null;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiresAt: expiresAt,
    } as any,
  });

  const link = `${env.FRONTEND_URL}/reset/${token}`;

  console.log('RESET LINK:', link);

  try {
    await sendResetEmail(user.email, link);
    console.log('Reset email sent successfully');
  } catch (err) {
    console.error('Email failed:', err);
  }

  return token;
}
export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } } as any });
  if (!user) {
    throw new AppError(400, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiresAt: null } as any });

  return true;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
