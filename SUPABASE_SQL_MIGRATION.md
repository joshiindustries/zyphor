# Supabase Migration SQL (PostgreSQL + Auth)

This project now uses Supabase Auth for email/password sign-in and keeps Google/GitHub OAuth through NextAuth.

Important:
- You cannot fetch a user's raw password from Google or GitHub. OAuth providers do not expose passwords.
- Store only profile data from OAuth (name, email, avatar, provider ID), never password material.

## 1) Core SQL Schema (run in Supabase SQL Editor)

```sql
-- Enable UUID generation
create extension if not exists pgcrypto;

-- Application users table (separate from auth.users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  name text,
  avatar text,
  dob text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, "providerAccountId")
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists public.links (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  max_downloads integer not null default 0,
  current_downloads integer not null default 0,
  allow_save integer not null default 1,
  auth_required integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references public.links(id) on delete cascade,
  original_name text not null,
  size integer not null,
  storage_path text not null,
  salt text not null,
  iv text not null
);

create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references public.links(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  ip_address text,
  downloaded_at timestamptz not null default now()
);

create index if not exists idx_download_logs_link_downloaded_at
  on public.download_logs(link_id, downloaded_at);

create index if not exists idx_download_logs_user_downloaded_at
  on public.download_logs(user_id, downloaded_at);

create table if not exists public.saved_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  link_id text not null references public.links(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, link_id)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  sender text not null,
  type text not null,
  data text not null,
  "timestamp" bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_channel_timestamp
  on public.signals(channel_id, "timestamp");

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  action text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_identifier_action
  on public.rate_limits(identifier, action);
```

## 1b) Incremental SQL for existing deployments

If your schema already exists, run this patch SQL to add the new download-auth toggle + private download logs:

```sql
alter table public.links
  add column if not exists auth_required integer not null default 0;

create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references public.links(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  ip_address text,
  downloaded_at timestamptz not null default now()
);

create index if not exists idx_download_logs_link_downloaded_at
  on public.download_logs(link_id, downloaded_at);

create index if not exists idx_download_logs_user_downloaded_at
  on public.download_logs(user_id, downloaded_at);
```

## 2) Optional: Link app users to Supabase Auth users

If you want direct mapping between `public.users` and `auth.users`, add:

```sql
alter table public.users
  add column if not exists supabase_auth_id uuid unique references auth.users(id) on delete set null;
```

Backfill by email:

```sql
update public.users u
set supabase_auth_id = a.id
from auth.users a
where lower(u.email) = lower(a.email)
  and u.supabase_auth_id is null;
```

## 3) Security / RLS Baseline (recommended)

If you query these tables directly from Supabase clients, enable RLS:

```sql
alter table public.users enable row level security;
alter table public.links enable row level security;
alter table public.files enable row level security;
alter table public.saved_links enable row level security;

-- Example: users can read/update only their own row via mapped auth ID
create policy if not exists users_select_own
  on public.users for select
  using (supabase_auth_id = auth.uid());

create policy if not exists users_update_own
  on public.users for update
  using (supabase_auth_id = auth.uid());
```

Note: If your app continues using server-side Prisma only, RLS is still recommended for defense in depth.

## 4) Environment Variables

Set these values:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SUPABASE_STORAGE_BUCKET=<bucket-name>
TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret>
```

Important:
- Use the base Supabase URL for `SUPABASE_URL` (no `/rest/v1` suffix).
- Replace `<project-ref>` and `<password>` completely. If either is left as placeholder text, Prisma will fail.
- Ensure Supabase project network access allows connections from your runtime environment.
- Create the storage bucket in Supabase Storage before uploading files (for example `uploads`).
- Server uploads/deletes should use `SUPABASE_SERVICE_ROLE_KEY`; no Google Cloud Storage keys are required.

Also rotate leaked/weak keys immediately:
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_SECRET`

## 5) Troubleshooting (matches common runtime errors)

### `Can't reach database server at db.your-project-ref.supabase.co` (`P1001`)
This means the DB host is still placeholder or unreachable.

Checklist:
1. Confirm `DATABASE_URL` uses your real project ref and password.
2. Confirm the host format: `db.<project-ref>.supabase.co`.
3. Restart `npm run dev` after editing `.env`.
4. Verify outbound network access to Supabase Postgres from your machine/server.

### `PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`
With Prisma v7 + `@prisma/adapter-pg`, this usually means Prisma client setup did not receive a valid connection configuration.

Checklist:
1. Ensure `DATABASE_URL` exists and is not empty.
2. Ensure Prisma is initialized with `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
3. Run `npx prisma generate` after dependency or schema changes.

### Google/GitHub password expectations
You can sync user profile fields (name, email, avatar), but **you cannot fetch user passwords** from Google or GitHub OAuth providers. Use Supabase password auth for email/password accounts.

-- Phase 9: Security Dashboard Models
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  location TEXT,
  os TEXT,
  browser TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  name TEXT,
  os TEXT,
  browser TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Phase 10: Password Manager
CREATE TABLE password_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
