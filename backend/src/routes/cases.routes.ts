import { Router, Response } from 'express';
import { z } from 'zod';
import { CaseStatus, Role } from '@prisma/client';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { assertCaseAccess, assertCaseOwner } from '../services/access.service';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { paginate, paginationMeta, paginationSchema } from '../utils/pagination';
import { paramId } from '../utils/params';

const router = Router();

const createCaseSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  level: z.string().min(1).max(20),
  location: z.string().max(200).optional(),
  budgetPerHour: z.number().positive(),
});

const updateCaseSchema = createCaseSchema.partial().extend({
  status: z.nativeEnum(CaseStatus).optional(),
});

const listCasesSchema = paginationSchema.extend({
  search: z.string().optional(),
  subject: z.string().optional(),
  level: z.string().optional(),
  status: z.nativeEnum(CaseStatus).optional(),
});

const inviteSchema = z.object({ tutorId: z.string().uuid() });

/**
 * @openapi
 * /api/cases:
 *   post:
 *     summary: Create a tuition case (parents only)
 *     tags:
 *       - Cases
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, subject, level, budgetPerHour]
 *             properties:
 *               title:
 *                 type: string
 *               subject:
 *                 type: string
 *               level:
 *                 type: string
 *               location:
 *                 type: string
 *               budgetPerHour:
 *                 type: number
 *     responses:
 *       '201':
 *         description: Created case
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, requireRole(Role.PARENT), async (req: AuthRequest, res: Response, next) => {
  try {
    const input = createCaseSchema.parse(req.body);
    const tuitionCase = await prisma.case.create({
      data: { ...input, ownerId: req.user!.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ case: tuitionCase });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases:
 *   get:
 *     summary: List cases visible to current user
 *     tags:
 *       - Cases
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
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, MATCHED, CLOSED]
 *     responses:
 *       '200':
 *         description: List of cases with pagination
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const query = listCasesSchema.parse(req.query);
    const { skip, take } = paginate(query.page, query.limit);

    const where: Record<string, unknown> = {};

    if (req.user!.role === Role.PARENT) {
      where.ownerId = req.user!.id;
    } else {
      where.invitations = {
        some: { tutorId: req.user!.id, revokedAt: null },
      };
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }
    if (query.subject) where.subject = { equals: query.subject, mode: 'insensitive' };
    if (query.level) where.level = query.level;
    if (query.status) where.status = query.status;

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { documents: true, invitations: true } },
        },
      }),
      prisma.case.count({ where }),
    ]);

    res.json({
      cases,
      pagination: paginationMeta(total, query.page, query.limit),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases/{id}:
 *   get:
 *     summary: Get case by ID (authorized users only)
 *     tags:
 *       - Cases
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Case details
 *       '404':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req.params.id);
    await assertCaseAccess(req.user!, id);
    const tuitionCase = await prisma.case.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        invitations: {
          where: { revokedAt: null },
          include: { tutor: { select: { id: true, name: true, email: true } } },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({ case: tuitionCase });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases/{id}:
 *   patch:
 *     summary: Update case (owner only)
 *     tags:
 *       - Cases
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               subject:
 *                 type: string
 *               level:
 *                 type: string
 *               location:
 *                 type: string
 *               budgetPerHour:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [OPEN, MATCHED, CLOSED]
 *     responses:
 *       '200':
 *         description: Updated case
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
router.patch('/:id', requireAuth, requireRole(Role.PARENT), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req.params.id);
    await assertCaseOwner(req.user!, id);
    const input = updateCaseSchema.parse(req.body);
    const tuitionCase = await prisma.case.update({
      where: { id },
      data: input,
    });
    res.json({ case: tuitionCase });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases/{id}/invitations:
 *   post:
 *     summary: Invite a tutor to a case (owner only)
 *     tags:
 *       - Cases
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tutorId]
 *             properties:
 *               tutorId:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Invitation created
 *       '400':
 *         $ref: '#/components/schemas/Error'
 */
router.post('/:id/invitations', requireAuth, requireRole(Role.PARENT), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req.params.id);
    await assertCaseOwner(req.user!, id);
    const { tutorId } = inviteSchema.parse(req.body);

    const tutor = await prisma.user.findUnique({ where: { id: tutorId } });
    if (!tutor || tutor.role !== Role.TUTOR) {
      throw new AppError(400, 'Invalid tutor', 'INVALID_TUTOR');
    }

    const invitation = await prisma.caseInvitation.upsert({
      where: { caseId_tutorId: { caseId: id, tutorId } },
      create: { caseId: id, tutorId },
      update: { revokedAt: null, invitedAt: new Date() },
      include: { tutor: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ invitation });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases/{id}/invitations/{tutorId}:
 *   delete:
 *     summary: Revoke tutor access to a case (owner only)
 *     tags:
 *       - Cases
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Access revoked
 *       '404':
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/:id/invitations/:tutorId', requireAuth, requireRole(Role.PARENT), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req.params.id);
    const tutorId = paramId(req.params.tutorId);
    await assertCaseOwner(req.user!, id);
    const invitation = await prisma.caseInvitation.findUnique({
      where: { caseId_tutorId: { caseId: id, tutorId } },
    });
    if (!invitation || invitation.revokedAt) {
      throw new AppError(404, 'Invitation not found', 'NOT_FOUND');
    }
    await prisma.caseInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });
    res.json({ message: 'Access revoked' });
  } catch (e) {
    next(e);
  }
});

export default router;
