# Tuition Case Marketplace Frontend Documentation

## Overview

The frontend is built using Next.js (App Router), TypeScript, and Tailwind CSS.

The application supports two user roles:

- Parent
- Tutor

Users authenticate using JWT-based authentication and interact with the backend through REST APIs.

---

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Axios
- JWT Authentication

---

## Project Structure

frontend/
├── src/
│ ├── app/
│ ├── components/
│ ├── lib/
│ └── providers/

### App Routes

/login
/register
/forgot
/reset/[token]

/parent/cases
/parent/cases/new
/parent/cases/[id]

/parent/tutors
/parent/tutors/[userId]

/tutor/profile
/tutor/cases
/tutor/cases/[id]

/docs

---

## Components

Reusable UI components:

- Navbar
- StatusBadge
- EmptyState
- ErrorAlert
- LoadingSpinner
- DocumentList
- DownloadButton

---

## Authentication

Authentication is handled using JWT tokens.

Flow:

1. User logs in
2. Backend validates credentials
3. JWT token returned
4. Token stored in browser
5. AuthProvider manages session state

---

## State Management

The application uses:

- React State
- Context API
- TanStack Query

TanStack Query handles:

- API caching
- Data synchronization
- Loading states
- Error states

---

## API Layer

API requests are centralized in:

src/lib/api.ts

Responsibilities:

- Request configuration
- Authorization headers
- Error handling
- Token management

---

## Parent Features

- Browse tutor directory
- View tutor profiles
- Create tuition cases
- Upload documents
- Invite tutors

---

## Tutor Features

- Manage tutor profile
- Upload qualification documents
- View invited cases
- Download case documents

---

## Document Management

Supported features:

- Secure upload
- Secure download
- Access-controlled document viewing

Only authorized users can access files.

---

## Security

Server-side access control ensures:

- Parents can access only their own cases.
- Tutors can access only invited cases.
- Documents are protected through authorization checks.

---

## Future Improvements

- Unit Testing
- E2E Testing
- Notifications
- Advanced Search
- Storybook