import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { DocumentOwnerType } from '@prisma/client';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { assertCaseAccess } from '../services/access.service';
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
import { paramId } from '../utils/params';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

/**
 * @openapi
 * /api/cases/{caseId}/documents:
 *   post:
 *     summary: Upload a document to a case
 *     tags:
 *       - Documents
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
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
router.post('/cases/:caseId/documents', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    const caseId = paramId(req.params.caseId);
    await assertCaseAccess(req.user!, caseId);
    if (!req.file) {
      throw new AppError(400, 'No file uploaded', 'NO_FILE');
    }

    validateFile(req.file.mimetype, req.file.originalname, req.file.size);
    await ensureUploadDir();

    const originalFilename = sanitizeFilename(req.file.originalname);
    const storedFilename = generateStoredFilename(originalFilename);
    const filePath = getFilePath(storedFilename);

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, req.file.buffer);

    const document = await prisma.document.create({
      data: {
        originalFilename,
        storedFilename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user!.id,
        ownerType: DocumentOwnerType.CASE,
        caseId,
      },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
        uploadedById: true,
      },
    });

    res.status(201).json({ document });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/cases/{caseId}/documents:
 *   get:
 *     summary: List documents for a case
 *     tags:
 *       - Documents
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Documents list
 *       '404':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/cases/:caseId/documents', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const caseId = paramId(req.params.caseId);
    await assertCaseAccess(req.user!, caseId);
    const documents = await prisma.document.findMany({
      where: { caseId, ownerType: DocumentOwnerType.CASE },
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
    });
    res.json({ documents });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/documents/{id}/download:
 *   get:
 *     summary: Download a document (re-checks authorization)
 *     tags:
 *       - Documents
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
 *         description: File download
 *       '404':
 *         $ref: '#/components/schemas/Error'
 */
router.get('/documents/:id/download', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const docId = paramId(req.params.id);
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!document) {
      throw new AppError(404, 'Document not found', 'NOT_FOUND');
    }

    if (document.ownerType === DocumentOwnerType.CASE && document.caseId) {
      await assertCaseAccess(req.user!, document.caseId);
    } else if (document.ownerType === DocumentOwnerType.TUTOR_PROFILE && document.tutorProfileId) {
      const profile = await prisma.tutorProfile.findUnique({ where: { id: document.tutorProfileId } });
      if (!profile) throw new AppError(404, 'Document not found', 'NOT_FOUND');
      const { assertTutorProfileAccess } = await import('../services/access.service');
      await assertTutorProfileAccess(req.user!, profile.userId);
    } else {
      throw new AppError(404, 'Document not found', 'NOT_FOUND');
    }

    const filePath = getFilePath(document.storedFilename);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=\"${document.originalFilename}\"`);
    res.sendFile(path.resolve(filePath));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/documents/{id}:
 *   delete:
 *     summary: Delete a document (uploader or case/profile owner)
 *     tags:
 *       - Documents
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
 *         description: Document deleted
 *       '403':
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/documents/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const docId = paramId(req.params.id);
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!document) {
      throw new AppError(404, 'Document not found', 'NOT_FOUND');
    }

    const isUploader = document.uploadedById === req.user!.id;

    let isCaseOwner = false;
    if (document.caseId) {
      const tuitionCase = await prisma.case.findUnique({ where: { id: document.caseId }, select: { ownerId: true } });
      isCaseOwner = tuitionCase?.ownerId === req.user!.id;
    }

    let isProfileOwner = false;
    if (document.tutorProfileId) {
      const profile = await prisma.tutorProfile.findUnique({ where: { id: document.tutorProfileId }, select: { userId: true } });
      isProfileOwner = profile?.userId === req.user!.id;
    }

    if (!isUploader && !isCaseOwner && !isProfileOwner) {
      throw new AppError(403, 'Not allowed to delete this document', 'FORBIDDEN');
    }

    await deleteStoredFile(document.storedFilename);
    await prisma.document.delete({ where: { id: document.id } });
    res.json({ message: 'Document deleted' });
  } catch (e) {
    next(e);
  }
});

export default router;
