import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { DocumentOwnerType, Role } from '@prisma/client';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { assertTutorProfileAccess } from '../services/access.service';
import {
  deleteStoredFile,
  ensureUploadDir,
  generateStoredFilename,
  getFilePath,
  sanitizeFilename,
  validateFile,
} from '../services/file.service';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { paginate, paginationMeta, paginationSchema } from '../utils/pagination';
import { paramId } from '../utils/params';

const router = Router();

const profileSchema = z.object({
  displayName: z.string().min(1).max(100),
  qualifications: z.string().max(5000).optional(),
  experiences: z.string().max(5000).optional(),
});

const listTutorsSchema = paginationSchema.extend({
  search: z.string().optional(),
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

/**
 * @openapi
 * /api/tutors:
 *   get:
 *     summary: Browse tutor directory (parents only)
 *     tags:
 *       - Tutors
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: List of tutor profiles with pagination
 */
router.get('/', requireAuth, requireRole(Role.PARENT), async (req: AuthRequest, res: Response, next) => {
  try {
    const query = listTutorsSchema.parse(req.query);
    const { skip, take } = paginate(query.page, query.limit);

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { qualifications: { contains: query.search, mode: 'insensitive' } },
        { experiences: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [profiles, total] = await Promise.all([
      prisma.tutorProfile.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.tutorProfile.count({ where }),
    ]);

    res.json({
      tutors: profiles,
      pagination: paginationMeta(total, query.page, query.limit),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/tutors/me:
 *   get:
 *     summary: Get own tutor profile
 *     tags:
 *       - Tutors
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Tutor profile
 *       '401':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/me', requireAuth, requireRole(Role.TUTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedBy: { select: { id: true, name: true } },
            uploadedById: true,
          },
        },
      },
    });
    res.json({ profile });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/tutors/me:
 *   put:
 *     summary: Create or update own tutor profile
 *     tags:
 *       - Tutors
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName]
 *             properties:
 *               displayName:
 *                 type: string
 *               qualifications:
 *                 type: string
 *               experiences:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Upserted tutor profile
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
router.put('/me', requireAuth, requireRole(Role.TUTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const profile = await prisma.tutorProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...input, qualifications: input.qualifications ?? '', experiences: input.experiences ?? '' },
      update: input,
      include: {
        documents: {
          select: { id: true, originalFilename: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { id: true, name: true } }, uploadedById: true },
        },
      },
    });
    res.json({ profile });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/tutors/me/documents:
 *   post:
 *     summary: Upload document to own tutor profile
 *     tags:
 *       - Tutors
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Document uploaded
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
router.post('/me/documents', requireAuth, requireRole(Role.TUTOR), upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');

    let profile = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      profile = await prisma.tutorProfile.create({
        data: {
          userId: req.user!.id,
          displayName: req.user!.name,
          qualifications: '',
          experiences: '',
        },
      });
    }

    validateFile(req.file.mimetype, req.file.originalname, req.file.size);
    await ensureUploadDir();

    const originalFilename = sanitizeFilename(req.file.originalname);
    const storedFilename = generateStoredFilename(originalFilename);
    const fs = await import('fs/promises');
    await fs.writeFile(getFilePath(storedFilename), req.file.buffer);

    const document = await prisma.document.create({
      data: {
        originalFilename,
        storedFilename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user!.id,
        ownerType: DocumentOwnerType.TUTOR_PROFILE,
        tutorProfileId: profile.id,
      },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ document });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/tutors/{userId}:
 *   get:
 *     summary: View tutor profile (parents or owning tutor)
 *     tags:
 *       - Tutors
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Tutor profile
 *       '404':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/:userId', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = paramId(req.params.userId);
    await assertTutorProfileAccess(req.user!, userId);
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        documents: {
          select: { id: true, originalFilename: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { id: true, name: true } }, uploadedById: true },
        },
      },
    });
    if (!profile) {
      throw new AppError(404, 'Tutor profile not found', 'NOT_FOUND');
    }
    res.json({ profile });
  } catch (e) {
    next(e);
  }
});

export default router;
