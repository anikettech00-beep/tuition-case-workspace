import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, env } from '../config/env';
import { AppError } from '../lib/errors';

/**
 * Sanitizes filenames to prevent path traversal and unsafe characters.
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function validateFile(mimetype: string, originalname: string, size: number) {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new AppError(400, `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`, 'INVALID_FILE_TYPE');
  }
  if (!ALLOWED_MIME_TYPES.includes(mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new AppError(400, 'MIME type not allowed', 'INVALID_MIME_TYPE');
  }
  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (size > maxBytes) {
    throw new AppError(413, `File exceeds maximum size of ${env.MAX_FILE_SIZE_MB}MB`, 'FILE_TOO_LARGE');
  }
}

export async function ensureUploadDir() {
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
}

export function generateStoredFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  return `${uuidv4()}${ext}`;
}

export function getFilePath(storedFilename: string): string {
  const resolved = path.resolve(env.UPLOAD_DIR, storedFilename);
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  if (!resolved.startsWith(uploadRoot + path.sep) && resolved !== uploadRoot) {
    throw new AppError(400, 'Invalid file path', 'INVALID_PATH');
  }
  return resolved;
}

export async function deleteStoredFile(storedFilename: string) {
  try {
    await fs.unlink(getFilePath(storedFilename));
  } catch {
    // File may already be gone
  }
}
