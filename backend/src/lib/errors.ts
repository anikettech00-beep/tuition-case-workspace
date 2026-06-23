/**
 * Application error with HTTP status code.
 * Used by the global error handler to return safe client responses.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message = 'Resource not found'): T {
  if (value == null) {
    throw new AppError(404, message, 'NOT_FOUND');
  }
  return value;
}
