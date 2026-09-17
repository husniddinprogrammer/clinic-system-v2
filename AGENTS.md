<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Clinic System - Project Info

## Commands
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Prisma migrate: `npx prisma migrate dev --name <name>`
- Prisma seed: `npx prisma db seed`
- Prisma studio: `npx prisma studio`

## Database
- PostgreSQL 16 at `C:\Program Files\PostgreSQL\16`
- DB: `clinic`, user: `postgres`, password: `clinic123`, port: `5432`
- Start PostgreSQL: `& "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\16\data" -h localhost`

## Auth
- JWT session in HttpOnly cookie (`clinic_session`)
- Password hashing: bcryptjs
- Roles: ADMIN, DOCTOR, NURSE
- Initial admin: `admin` / `admin123`

## Architecture
- App Router with route group `(dashboard)` for protected pages
- Server Components for data fetching, Server Actions for mutations
- Client components for forms/modals (components/*.tsx)
- Route Handlers for file ops (Excel import, backup)
- Single Prisma client: `src/lib/prisma.ts`
- Auth/session: `src/lib/auth.ts`
- Permissions: `src/lib/permissions.ts`

