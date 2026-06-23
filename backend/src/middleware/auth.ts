import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const COOKIE_NAME = 'session';

export function getTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[COOKIE_NAME];
}

/**
 * Verifies JWT and attaches the current user to the request.
 * Returns 401 when missing or invalid.
 */
export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError(401, 'Session expired or invalid', 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, 'Session expired or invalid', 'UNAUTHORIZED'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'You do not have permission for this action', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export { COOKIE_NAME };
