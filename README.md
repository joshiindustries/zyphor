# Zyphor

**Zyphor** is a unified secure communication and productivity platform by **J Industries** — combining end-to-end encrypted messaging, file transfer, personal vault storage, secure notes, and a password manager into one privacy-first experience.

> Full feature catalog and implementation status: see [`project_documentation.md`](./project_documentation.md)

---

## Platform Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Zyphor Files** | E2EE file sharing, WebRTC P2P, burn-after-download | ✅ Live |
| **Zyphor Vault** | Personal encrypted storage (documents, media, keys) | 🔜 Planned |
| **Secure Chat** | 1:1 encrypted messaging with rich media | 🔜 Planned |
| **Group Chat** | Encrypted group channels with roles & moderation | 🔜 Planned |
| **Secure Notes** | E2EE notes, checklists, code snippets | 🔜 Planned |
| **Password Manager** | E2EE credentials, OTP, password generator | 🔜 Planned |
| **Voice & Video** | Encrypted calls, screen share, group meetings | 🔜 Planned |
| **AI Features** | Smart search, summaries, spam/phishing detection | 🔜 Planned |
| **Enterprise** | Workspaces, team vaults, SSO, compliance logs | 🔜 Planned |

---

## Currently Live (v5.21.33)

### Authentication & Security
- User registration & secure login (Supabase Auth + NextAuth)
- Google & GitHub OAuth
- JWT session management (7-day sessions)
- CSRF protection, rate limiting, Cloudflare Turnstile CAPTCHA
- TLS/HTTPS, AES-256-GCM file encryption (client-side)

### Zyphor Files
- Client-side E2EE upload (AES-256-GCM + PBKDF2)
- Password modes: auto-link, passphrase, random key, custom password
- WebRTC direct P2P transfer
- Burn after download, custom link aliases
- Login-required downloads, download limits, 7-day expiry
- Save to Vault (link references in dashboard)
- Upload progress indicator

### User Profile (partial)
- Profile picture, display name, date of birth
- Profile edit page

### Dashboard
- Manage shared files and saved links
- Download count tracking

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 18, TypeScript |
| Database | Prisma 7 + PostgreSQL (Supabase) |
| Auth | NextAuth v4 + Supabase Auth |
| Storage | Supabase Storage |
| Crypto | Web Crypto API (AES-256-GCM, PBKDF2) |
| P2P | WebRTC + signaling server |
| Mobile | Capacitor 6 (Android) |

---

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL`, Supabase keys, NextAuth secret, and OAuth provider credentials.
3. Run Supabase SQL migration (see `SUPABASE_SQL_MIGRATION.md`).
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # File upload & share (Zyphor Files)
│   ├── [id]/                 # Download & decrypt page
│   ├── p2p/[id]/             # WebRTC receiver
│   ├── dashboard/            # Vault dashboard (shared + saved links)
│   ├── login/ register/ profile/
│   └── api/                  # Upload, download, auth, links, webrtc
├── components/               # Shared UI components
└── lib/
    ├── crypto.ts             # Client-side E2EE
    ├── auth.ts               # NextAuth config
    ├── db.ts                 # Prisma client
    ├── supabase-*.ts         # Supabase auth & storage
    └── security.ts           # Validation & headers
```

---

## Error Pages

| Route | Handler |
|-------|---------|
| App errors | `src/app/error.tsx` |
| Critical shell errors | `src/app/global-error.tsx` |
| 404 | `src/app/not-found.tsx` |
| Error guide | `/help/errors` |

---

## Legal

Proprietary software by **J Industries**. See `LICENSE` for terms.
