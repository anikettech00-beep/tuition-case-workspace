import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

/**
 * Global error handler — never leaks stack traces in production.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        message: 'File too large',
        code: 'FILE_TOO_LARGE',
      },
    });
    return;
  }

  // Map Prisma client errors to friendly API responses
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Common Prisma error codes: P2002 (unique constraint), P2025 (not found)
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'Conflict: resource already exists', code: 'DUPLICATE_RECORD' } });
      console.error('Prisma P2002:', err.meta ?? err.message);
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Resource not found', code: 'NOT_FOUND' } });
      console.error('Prisma P2025:', err.meta ?? err.message);
      return;
    }

    // Fallback for other known request errors
    res.status(500).json({ error: { message: 'Database error', code: 'DATABASE_ERROR' } });
    console.error('Prisma KnownRequestError:', err);
    return;
  }

  // Unexpected/unhandled errors: never return internal exception messages to the client
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
