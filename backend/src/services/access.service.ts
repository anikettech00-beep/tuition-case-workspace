import { Role } from '@prisma/client';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../middleware/auth';

/**
 * Centralized access control for cases and documents.
 *
 * 404 vs 403 policy: We return 404 when a user cannot see a case at all
 * (not owner, not invited tutor) to avoid leaking case existence to unauthorized users.
 * We return 403 when the user is authenticated and the resource exists but the action
 * is not permitted (e.g., tutor trying to edit a case they can view).
 */
export async function canAccessCase(user: AuthUser, caseId: string): Promise<boolean> {
  const tuitionCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: { ownerId: true },
  });
  if (!tuitionCase) return false;

  if (user.role === Role.PARENT && tuitionCase.ownerId === user.id) {
    return true;
  }

  if (user.role === Role.TUTOR) {
    const invitation = await prisma.caseInvitation.findFirst({
      where: { caseId, tutorId: user.id, revokedAt: null },
    });
    return !!invitation;
  }

  return false;
}

export async function assertCaseAccess(user: AuthUser, caseId: string) {
  const tuitionCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, ownerId: true },
  });

  if (!tuitionCase) {
    throw new AppError(404, 'Case not found', 'NOT_FOUND');
  }

  const allowed = await canAccessCase(user, caseId);
  if (!allowed) {
    // Return 404 to avoid leaking existence
    throw new AppError(404, 'Case not found', 'NOT_FOUND');
  }

  return tuitionCase;
}

export async function assertCaseOwner(user: AuthUser, caseId: string) {
  const tuitionCase = await assertCaseAccess(user, caseId);
  if (tuitionCase.ownerId !== user.id) {
    throw new AppError(403, 'Only the case owner can perform this action', 'FORBIDDEN');
  }
  return tuitionCase;
}

export async function canAccessTutorProfile(viewer: AuthUser, tutorUserId: string): Promise<boolean> {
  if (viewer.role === Role.PARENT) return true;
  if (viewer.role === Role.TUTOR && viewer.id === tutorUserId) return true;
  return false;
}

export async function assertTutorProfileAccess(viewer: AuthUser, tutorUserId: string) {
  const allowed = await canAccessTutorProfile(viewer, tutorUserId);
  if (!allowed) {
    throw new AppError(403, 'You do not have permission to view this profile', 'FORBIDDEN');
  }
}
