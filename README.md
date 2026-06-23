# Tuition Case Marketplace

A full-stack tuition marketplace where **parents** post tuition cases and **tutors** browse invited cases, with fine-grained access control and secure document handling.

## Live Deployment

| Resource | URL |
|----------|-----|
| **Frontend** | _Deploy and add URL here_ |
| **Backend API** | _Deploy and add URL here_ |
| **Swagger / OpenAPI** | `{API_URL}/api/docs` |
| **Frontend Docs** | `{FRONTEND_URL}/docs` |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Parent | `parent@demo.com` | `password123` |
| Tutor | `tutor@demo.com` | `password123` |

## Architecture

```
tuition-case-workspace/
├── backend/          # Express + Prisma REST API
├── frontend/         # Next.js App Router UI
├── docs/             # Additional documentation
└── docker-compose.yml
```

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15, TypeScript, Tailwind, TanStack Query, React Hook Form | Matches stack preferences; App Router for clean route guards |
| Backend | Express 5, TypeScript, Prisma | Lightweight, explicit control over auth and file handling |
| Database | PostgreSQL | Relational data with invitations and access rules |
| Auth | JWT in **httpOnly cookie** + Bearer header | Cookie for browser sessions; Bearer for API flexibility. Passwords hashed with bcrypt (12 rounds) |
| Files | Local disk (UUID filenames) | Simple for take-home; path traversal prevented; auth re-checked on download |
| API Docs | Swagger UI at `/api/docs` | OpenAPI 3.0 via swagger-jsdoc |

### Auth Tradeoffs

- **httpOnly cookies** prevent XSS token theft; `sameSite: lax` mitigates CSRF for state-changing requests from external sites.
- JWT expiry (7 days) returns 401; frontend clears token and redirects to login.
- We also return the token in the login response for API clients; stored in localStorage as Bearer fallback.

### Access Control (Server-Side)

| Resource | Parent (owner) | Parent (other) | Tutor (invited) | Tutor (not invited) |
|----------|----------------|----------------|-----------------|---------------------|
| Own cases | CRUD + invite | — | — | — |
| Invited case | — | — | Read + upload docs | 404 (no leak) |
| Tutor directory | Browse all | — | 403 | — |
| Tutor profile | View any | — | Own only | 403 for others |

**404 vs 403:** Unauthorized case access returns **404** to avoid leaking case existence.

### File Upload Constraints

- **Allowed types:** PDF, DOC, DOCX, PNG, JPG/JPEG
- **Max size:** 10 MB (configurable via `MAX_FILE_SIZE_MB`)
- Filenames sanitized; stored as UUID + extension; server paths never exposed in API

## Quick Start (Local)

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ (or Docker)

### 1. Database

```bash
docker compose up postgres -d
# or use an existing Postgres and set DATABASE_URL
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

API: http://localhost:4000  
Swagger: http://localhost:4000/api/docs

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### Docker (all services)

```bash
docker compose up --build
```

## API Endpoints (Summary)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register parent or tutor |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/cases` | List / create cases |
| GET/PATCH | `/api/cases/:id` | View / update case |
| POST/DELETE | `/api/cases/:id/invitations` | Invite / revoke tutor |
| GET/POST | `/api/cases/:caseId/documents` | List / upload case docs |
| GET | `/api/documents/:id/download` | Download (auth re-checked) |
| GET | `/api/tutors` | Tutor directory (parents) |
| GET/PUT | `/api/tutors/me` | Own tutor profile |
| POST | `/api/tutors/me/documents` | Profile document upload |
| GET | `/api/tutors/:userId` | View tutor profile |

Full OpenAPI spec: `/api/docs.json`

## Deployment Guide

### Backend (Render / Railway / Fly.io)

1. Create a PostgreSQL database
2. Deploy `backend/` with:
   - `DATABASE_URL`, `JWT_SECRET` (32+ chars), `FRONTEND_URL`, `NODE_ENV=production`
   - SMTP settings for password reset mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
3. Add a persistent volume for `UPLOAD_DIR` if using local file storage

### Frontend (Vercel)

1. Import `frontend/` directory
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL
3. Deploy

### Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## Video Walkthrough

_Record a 5–10 minute walkthrough and add your link here._

Suggested flow:
1. Login as tutor → edit profile → upload document
2. Login as parent → browse tutors → create case → invite tutor → upload document
3. Login as tutor → view invited case → download/upload documents
4. Explain auth, access control, and file handling

## What I'd Improve With More Time

- S3-compatible object storage for documents (production durability)
- Refresh tokens / shorter access token TTL
- E2E tests with Playwright
- Email notifications on tutor invitation
- Optimistic UI updates for invitations

## License

MIT — take-home assessment project.
