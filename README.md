# Zyphor Secure File Share

Zyphor is a Next.js-based encrypted file transfer application built by **J Industries**.

## Core Features
- End-to-end encrypted file sharing
- Password-protected transfer links
- Optional signed-in-only download protection
- Per-link download tracking (private logs)
- Dashboard for managing shared and saved links
- Profile management and social sign-in support
- Custom error handling pages (`error`, `global-error`, `404 not found`)

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL (Supabase)
- NextAuth
- Supabase Storage

## Local Setup
1. Install dependencies:
   - `npm install`
2. Configure environment:
   - copy `.env.example` to `.env`
   - set `DATABASE_URL`, Supabase keys, auth provider secrets
3. Generate Prisma client:
   - `npx prisma generate`
4. Run app:
   - `npm run dev`

## Database Notes
- Run SQL in `SUPABASE_SQL_MIGRATION.md` for required tables and indexes.
- If schema changes, regenerate Prisma client and restart dev server.

## Error Pages
- Global app error: handled by `src/app/error.tsx`
- Critical shell error: handled by `src/app/global-error.tsx`
- Not found page: handled by `src/app/not-found.tsx`
- Error guide page: `/help/errors`

## Legal
This repository is proprietary software by **J Industries**.  
See `LICENSE` for terms.
