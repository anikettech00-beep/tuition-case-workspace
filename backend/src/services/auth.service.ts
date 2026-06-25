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
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM)) {
    throw new AppError(
      500,
      'Password reset email service is not configured',
      'EMAIL_NOT_CONFIGURED',
    );
  }

  // If SMTP is configured, use it. Otherwise fall back to logging/dev email only outside production.
  if (env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    } as any);

  

    const from = env.SMTP_FROM ?? `no-reply@${new URL(env.FRONTEND_URL).hostname}`;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Reset your TuitionCase password',
        text: `Reset your password using the following link: ${link}\n\nIf you did not request a password reset, you can ignore this email.`,
        html: `<p>Reset your password using the following link:</p><p><a href="${link}">${link}</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
      });
      console.log(`Password reset email sent to ${to}`);
      // If using a service that provides a preview URL (like Ethereal), log it
      try {
        const preview = (nodemailer as any).getTestMessageUrl(info);
        if (preview) console.log(`Preview URL: ${preview}`);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to send reset email via SMTP:', err);
      throw new AppError(
        502,
        'Failed to send password reset email',
        'EMAIL_SEND_FAILED',
      );
    }

    return;
  }

  // No SMTP configured: create a test account and send via Ethereal for development.
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    } as any);

    const from = `no-reply@${new URL(env.FRONTEND_URL).hostname}`;
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Reset your TuitionCase password (Ethereal)',
      text: `Reset your password using the following link: ${link}\n\nIf you did not request a password reset, you can ignore this email.`,
      html: `<p>Reset your password using the following link:</p><p><a href="${link}">${link}</a></p>`,
    });

    const preview = (nodemailer as any).getTestMessageUrl(info);
    console.log('Sent reset email using Ethereal dev account. Preview URL:', preview);
    console.log(`Password reset link: ${link}`);
  } catch (err) {
    console.error('Failed to send reset email (ethereal):', err);
    console.log(`Password reset link (fallback): ${link}`);
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

// export async function createPasswordResetToken(email: string) {
//   const normalizedEmail = email.trim().toLowerCase();
//   const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
//   if (!user) {
//     // Do not reveal whether the email exists.
//     return null;
//   }

//   const token = crypto.randomBytes(32).toString('hex');
//   const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

//   await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiresAt: expiresAt } as any });

//   const link = `${env.FRONTEND_URL}/reset/${token}`;

//   // Send email if SMTP configured, otherwise log link for dev use.
//   await sendResetEmail(user.email, link);

//   // Also log link for demo / developer use.
//   console.log(`Password reset link: ${link}`);

//   return token;
// }
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
