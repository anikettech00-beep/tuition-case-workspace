export type Role = 'PARENT' | 'TUTOR';

export type CaseStatus = 'OPEN' | 'MATCHED' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface TuitionCase {
  id: string;
  title: string;
  subject: string;
  level: string;
  location: string | null;
  budgetPerHour: number;
  status: CaseStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; email?: string };
  invitations?: CaseInvitation[];
  documents?: DocumentMeta[];
  _count?: { documents: number; invitations: number };
}

export interface CaseInvitation {
  id: string;
  caseId: string;
  tutorId: string;
  invitedAt: string;
  revokedAt: string | null;
  tutor?: { id: string; name: string; email: string };
}

export interface DocumentMeta {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy?: { id: string; name: string };
  uploadedById?: string;
}

export interface TutorProfile {
  id: string;
  userId: string;
  displayName: string;
  qualifications: string;
  experiences: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
  documents?: DocumentMeta[];
  _count?: { documents: number };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}
