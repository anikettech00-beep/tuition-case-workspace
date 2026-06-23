import { PrismaClient } from '@prisma/client';

/** Singleton Prisma client for the application lifecycle. */
export const prisma = new PrismaClient();
