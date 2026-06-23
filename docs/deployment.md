# Deployment Checklist

## Render (Backend + PostgreSQL)

1. Push repo to GitHub
2. Create new **Blueprint** from `render.yaml` or manually:
   - PostgreSQL database (`tuition-db`)
   - Web service from `backend/` directory
3. Set `FRONTEND_URL` to your Vercel URL (e.g. `https://tuition-case.vercel.app`)
4. Configure SMTP for password reset emails:
   - `SMTP_HOST` = your mail provider SMTP host
   - `SMTP_PORT` = `465` for SSL or `587` for STARTTLS
   - `SMTP_USER` = SMTP username
   - `SMTP_PASS` = SMTP password or app password
   - `SMTP_FROM` = sender address, e.g. `Tuition Case <no-reply@example.com>`
5. Note the API URL (e.g. `https://tuition-api.onrender.com`)

Swagger will be at: `https://tuition-api.onrender.com/api/docs`

## Vercel (Frontend)

1. Import `frontend/` directory
2. Set environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render API URL
3. Deploy

## Post-Deploy Verification

- [ ] Login as `parent@demo.com` / `password123`
- [ ] Browse tutor directory
- [ ] Create case, invite tutor, upload document
- [ ] Login as `tutor@demo.com` / `password123`
- [ ] View invited case, download/upload documents
- [ ] Swagger docs load at `/api/docs`
- [ ] Frontend docs at `/docs`
- [ ] Forgot-password request sends an email to a real inbox

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Parent | parent@demo.com | password123 |
| Tutor | tutor@demo.com | password123 |

Seeded automatically on first backend start (`npm run start:prod`).
