# Architecture Notes

## Security Model

All authorization is enforced in the Express middleware and service layer — never trusted from the client.

### Case Access Flow

```
Request → requireAuth → assertCaseAccess(caseId)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Parent owner    Invited tutor    Everyone else
              │               │               │
           Allow            Allow           404
```

### Document Download Flow

```
GET /documents/:id/download
  → Load document metadata from DB
  → Re-check case/profile access for requester
  → Resolve stored filename (path traversal guard)
  → Stream file with Content-Disposition
```

## Database Schema

See `backend/prisma/schema.prisma` for the full model.

Key relationships:
- `User` 1—N `Case` (as owner)
- `Case` N—M `User` (tutors via `CaseInvitation`)
- `Document` belongs to either a `Case` or `TutorProfile`

## Error Handling

- `AppError` carries HTTP status + safe message
- Zod validation errors return 400 with field details
- Production 500s never include stack traces
- Multer file size errors return 413
