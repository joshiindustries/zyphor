# Zyphor — Product Documentation

**Version:** 5.21.33  
**Author:** J Industries  
**Last updated:** July 2026

---

## 1. Overview

Zyphor is a unified secure communication and productivity platform. It combines end-to-end encrypted messaging, file transfer, personal vault storage, secure notes, a password manager, voice/video calls, and AI-assisted productivity — all under one privacy-first roof.

The platform is built on a zero-knowledge security model: encryption keys and plaintext content never leave the user's device unencrypted. The server stores only ciphertext and metadata required for routing and delivery.

### Design Principles
- **Zero-knowledge E2EE** for all sensitive content (messages, files, notes, passwords)
- **Client-side encryption** using Web Crypto API before any upload
- **Minimal server trust** — the operator cannot read user data
- **Cross-device sync** with end-to-end encrypted key backup (planned)
- **Modular architecture** — each module (Files, Chat, Vault, Notes, etc.) shares a common crypto and auth layer

---

## 2. Tech Stack

### Current (Live)
| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 18 |
| Styling | Custom CSS + Lucide React icons |
| Database | Prisma 7 + PostgreSQL (Supabase) |
| Auth | NextAuth v4 + Supabase Auth |
| File Storage | Supabase Storage |
| Crypto | Web Crypto API — AES-256-GCM, PBKDF2 (SHA-512) |
| P2P | WebRTC + DB-backed signaling |
| CAPTCHA | Cloudflare Turnstile |
| Mobile | Capacitor 6 (Android wrapper) |

### Planned Additions
| Component | Technology |
|-----------|------------|
| Real-time messaging | WebSocket / Supabase Realtime |
| Key exchange | RSA-4096 or X25519 (ECDH) |
| Password hashing | BCrypt (server-side auth layer) |
| Voice/Video | WebRTC media channels |
| Push notifications | Web Push API + FCM |
| Offline cache | IndexedDB + Service Workers |
| AI | External LLM API (on-device or privacy-preserving server-side) |
| Enterprise SSO | SAML 2.0 / OIDC |

---

## 3. Feature Catalog

Legend: ✅ Implemented · 🔄 Partial · 🔜 Planned

---

### 🔐 Authentication & Security

#### Authentication
| Feature | Status |
|---------|--------|
| User Registration | ✅ |
| Secure Login | ✅ |
| Email Verification | 🔜 (Supabase supports; UI flow pending) |
| Forgot Password | 🔜 |
| Reset Password | 🔜 |
| Change Password | 🔜 |
| Logout | ✅ |
| JWT Authentication | ✅ (NextAuth JWT, 7-day expiry) |
| Refresh Tokens | 🔜 |
| Remember Me | 🔜 |
| Session Management | ✅ (JWT sessions + Session table in schema) |
#### Security
| Feature | Status |
|---------|--------|
| BCrypt Password Hashing | 🔄 (scrypt legacy fallback; Supabase handles primary auth) |
| End-to-End Encryption (Messages) | 🔜 |
| End-to-End Encryption (Files) | ✅ |
| AES-256 Encryption | ✅ |
| RSA-4096 or ECC Key Exchange | 🔜 |
| TLS/HTTPS | ✅ |
| Secure Key Generation | ✅ |
| Private Key Stored Only on User Device | 🔄 (file keys in URL hash; device key store planned) |
| Public Key Management | 🔜 |
| Automatic Key Rotation | 🔜 |
### 👤 User Profile

| Feature | Status |
|---------|--------|
| Profile Picture | ✅ |
| Display Name | ✅ |
| Username | 🔜 |
| Bio/About | 🔜 |
| Online Status | 🔜 |
| Last Seen | 🔜 |
| Custom Status | 🔜 |
| Theme Preference | 🔜 |
| Language Preference | 🔜 |
| Privacy Settings | 🔜 |
### 💬 Secure Chat

| Feature | Status |
|---------|--------|
| One-to-One Chat | 🔜 |
| Send Text Messages | 🔜 |
| Emoji Support | 🔜 |
| Stickers | 🔜 |
| GIF Support | 🔜 |
| Markdown Formatting | 🔜 |
| Message Search | 🔜 |
| Message Reactions | 🔜 |
| Reply to Message | 🔜 |
| Forward Message | 🔜 |
| Copy Message | 🔜 |
| Delete for Me | 🔜 |
| Delete for Everyone | 🔜 |
| Edit Message | 🔜 |
| Pin Messages | 🔜 |
| Star Messages | 🔜 |
| Bookmark Messages | 🔜 |
| Message Timestamp | 🔜 |
| Read Receipts (Toggle) | 🔜 |
| Typing Indicator (Toggle) | 🔜 |
| Online Status (Toggle) | 🔜 |
| Delivery Status | 🔜 |
### 👥 Group Chat

| Feature | Status |
|---------|--------|
| Create Group | 🔜 |
| Group Profile Picture | 🔜 |
| Group Description | 🔜 |
| Invite Members | 🔜 |
| Join via Invite Link | 🔜 |
| Leave Group | 🔜 |
| Remove Member | 🔜 |
| Assign Group Owner | 🔜 |
| Multiple Group Moderators | 🔜 |
| Group Roles | 🔜 |
| Pin Group Messages | 🔜 |
| Group Search | 🔜 |
| Group Media Gallery | 🔜 |
| Shared Files | 🔜 |
| Shared Links | 🔜 |
### 📁 Zyphor Files


*Integrates the existing file-sharing application.*

| Feature | Status |
|---------|--------|
| Secure Upload | ✅ |
| End-to-End Encryption | 🔜 |
| AES-256 Encryption | ✅ |
| WebRTC Direct Transfer | ✅ |
| Burn After Download | ✅ |
| Password Protected Files | ✅ |
| Auto Generated Key | ✅ |
| Passphrase (Memorable) | ✅ |
| Custom Password | ✅ |
| Random Key | ✅ |
| Custom Alias | ✅ |
| Save to Vault | ✅ (link reference save) |
| Login Required Downloads | ✅ |
| Download Limit | ✅ |
| Expiry Date | ✅ (7-day default) |
| Maximum Download Count | ✅ |
| Large File Upload | 🔄 (50 MB per file limit) |
| Resume Upload | 🔜 |
| Resume Download | 🔜 |
| Upload Progress | ✅ |
| Download Progress | 🔄 (decrypt progress only) |

### 🔒 Zyphor Vault


*Personal encrypted storage.*

#### Store
| Feature | Status |
|---------|--------|

| Documents | 🔜 |
| Photos | 🔜 |
| Videos | 🔜 |
| Certificates | 🔜 |
| Backup Files | 🔜 |
| Encryption Keys | 🔜 |
| Personal Files | 🔜 |

#### Features
| Feature | Status |
|---------|--------|

| Folder Support | 🔜 |
| Search | 🔜 |
| Tags | 🔜 |
| Favorites | 🔜 |
| Offline Cache | 🔜 |
| Version History | 🔜 |
| 📝 Secure Notes | 🔜 |
| Rich Text Notes | 🔜 |
| Markdown Notes | 🔜 |
| Checklists | 🔜 |
| Code Snippets | 🔜 |
| Attach Files | 🔜 |
| Attach Images | 🔜 |
| Search | 🔜 |
| Categories | 🔜 |
| Pin Notes | 🔜 |
| Password Protected Notes | 🔜 |
| End-to-End Encryption | 🔜 |
### 🔑 Password Manager

| Feature | Status |
|---------|--------|
| Save Passwords | 🔜 |
| Generate Passwords | 🔜 |
| Password Strength Indicator | 🔄 (registration only) |
| Copy Password | 🔜 |
| Copy Username | 🔜 |
| OTP Secret Storage | 🔜 |
| Secure Notes | 🔜 |
| Website URL | 🔜 |
| Categories | 🔜 |
| Search | 🔜 |
| Favorites | 🔜 |
| End-to-End Encryption | 🔜 |
### 🔔 Notifications

| Feature | Status |
|---------|--------|
| New Message | 🔜 |
| Mention Notification | 🔜 |
| Group Notification | 🔜 |
| File Shared | 🔜 |
| File Downloaded | 🔜 |
| Login Alert | 🔜 |
| Device Login Alert | 🔜 |
| Email Notification | 🔜 |
| Desktop Notification | 🔜 |
| Notification Settings | 🔜 |
### 🔍 Search


#### Global Search
| Feature | Status |
|---------|--------|

| Search | 🔜 |

| Messages | 🔜 |
| Files | 🔜 |
| Users | 🔜 |
| Groups | 🔜 |
| Notes | 🔜 |
| Password Entries | 🔜 |
### 🎨 Personalization

| Feature | Status |
|---------|--------|
| Dark Mode | 🔜 |
| Light Mode | 🔜 |
| Accent Colors | 🔜 |
| Font Size | 🔜 |
| Chat Wallpaper | 🔜 |
| Chat Bubble Style | 🔜 |
| Notification Sounds | 🔜 |
| Custom Emoji Pack | 🔜 |
### 🌐 Cross Device

| Feature | Status |
|---------|--------|
| Multi Device Login | 🔜 |
| Device List | 🔜 |
| Device Name | 🔜 |
| Logout Specific Device | 🔜 |
| Sync Messages | 🔜 |
| Sync Files | 🔜 |
| Sync Settings | 🔜 |
### 📞 Voice Calls

| Feature | Status |
|---------|--------|
| One-to-One Voice Calls | 🔜 |
| Group Calls | 🔜 |
| Noise Suppression | 🔜 |
| Call Encryption | 🔜 |
### 🎥 Video Calls

| Feature | Status |
|---------|--------|
| HD Video | 🔜 |
| Screen Sharing | 🔜 |
| Blur Background | 🔜 |
| Meeting Links | 🔜 |
| Group Video | 🔜 |
### ⚡ Productivity

| Feature | Status |
|---------|--------|
| Pinned Chats | 🔜 |
| Archive Chats | 🔜 |
| Scheduled Messages | 🔜 |
| Draft Messages | 🔜 |
| Message Reminders | 🔜 |
| Favorites | 🔜 |
| Recent Files | 🔜 |
| Quick Actions | 🔜 |
### 📊 Storage

| Feature | Status |
|---------|--------|
| Storage Usage | 🔜 |
| File Statistics | 🔜 |
| Cleanup Suggestions | 🔜 |
| Recently Deleted | 🔜 |
| Restore Deleted Files | 🔜 |
| Trash Bin | 🔜 |
### ⚙️ Settings

#### Account
| Feature | Status |
|---------|--------|
| Profile | ✅ |
| Password | 🔜 |
| Email | 🔜 |
| Delete Account | 🔜 |
#### Privacy
| Feature | Status |
|---------|--------|
| Last Seen | 🔜 |
| Read Receipts | 🔜 |
| Online Status | 🔜 |
| Profile Visibility | 🔜 |
| Blocked Users | 🔜 |
#### Security
| Feature | Status |
|---------|--------|
| Active Sessions | 🔜 |
| Trusted Devices | 🔜 |
| Encryption Keys | 🔜 |
| Change Password | 🔜 |
#### Appearance
| Feature | Status |
|---------|--------|
| Theme | 🔜 |
| Font | 🔜 |
| Chat Background | 🔜 |
#### Notifications
| Feature | Status |
|---------|--------|
| Sounds | 🔜 |
| Popups | 🔜 |
| Email | 🔜 |
### 🤖 AI Features

| Feature | Status |
|---------|--------|
| Smart File Search | 🔜 |
| AI Chat Summary | 🔜 |
| AI Note Summary | 🔜 |
| Duplicate File Detection | 🔜 |
| AI Spam Detection | 🔜 |
| AI Phishing Link Detection | 🔜 |
### 🚀 Enterprise Features

| Feature | Status |
|---------|--------|
| Organization Workspaces | 🔜 |
| Shared Team Vaults | 🔜 |
| Secure Team Channels | 🔜 |
| Compliance Logs | 🔜 |
| Enterprise SSO | 🔜 |

---

## 4. Current Architecture

### Request Flow — File Upload
```
Browser                    Next.js API              Supabase
  │                            │                       │
  ├─ encryptFile() (AES-GCM)   │                       │
  ├─ POST /api/upload ────────►│                       │
  │                            ├─ validate + rate limit │
  │                            ├─ prisma.link.create   │
  │                            ├─ upload blob ────────►│ Storage
  │                            ├─ prisma.file.create   │
  │◄── { linkId } ─────────────┤                       │
  └─ share link + password     │                       │
```

### Request Flow — File Download
```
Browser                    Next.js API              Supabase
  │                            │                       │
  ├─ GET /api/download/[id] ──►│ (metadata)            │
  │◄── { files, salt, iv } ────┤                       │
  ├─ GET ?fileId=... ─────────►│                       │
  │                            ├─ fetch blob ─────────►│ Storage
  │◄── encrypted stream ───────┤                       │
  └─ decryptData() locally     │                       │
```

### WebRTC P2P Flow
```
Sender Browser          Signaling API           Receiver Browser
      │                      │                        │
      ├─ createOffer()         │                        │
      ├─ POST signal ───────►│                        │
      │                      │◄── GET signal ─────────┤
      │                      ├── offer ──────────────►│
      │                      │◄── POST answer ────────┤
      ├─ ICE candidates ────►│◄── ICE candidates ─────┤
      └─ DataChannel file transfer (direct, no server storage)
```

---

## 5. Database Schema (Current)

Managed via Prisma + PostgreSQL (Supabase). See `prisma/schema.prisma`.

| Table | Purpose |
|-------|---------|
| `users` | User profiles (email, name, avatar, dob) |
| `accounts` | OAuth provider links (NextAuth) |
| `sessions` | Custom session tokens |
| `links` | Shared file transfer sessions |
| `files` | Encrypted file metadata (salt, iv, storage path) |
| `saved_links` | User vault saves (link references) |
| `download_logs` | Private download audit trail |
| `signals` | WebRTC signaling messages |
| `rate_limits` | Abuse prevention counters |

### Planned Schema Extensions
- `conversations`, `messages`, `message_reactions` — Secure Chat
- `groups`, `group_members`, `group_roles` — Group Chat
- `vault_items`, `vault_folders`, `vault_tags` — Zyphor Vault
- `notes`, `note_categories` — Secure Notes
- `password_entries`, `password_categories` — Password Manager
- `devices`, `device_sessions` — Cross-device sync
- `notifications`, `notification_preferences` — Notifications
- `user_keys`, `key_rotations` — Public key management
- `organizations`, `workspaces`, `compliance_logs` — Enterprise

---

## 6. Directory Structure

```
src/
├── app/
│   ├── page.tsx                  # Zyphor Files — upload & share UI
│   ├── [id]/page.tsx             # Download & decrypt
│   ├── p2p/[id]/page.tsx         # WebRTC receiver
│   ├── dashboard/
│   │   ├── page.tsx              # Vault dashboard
│   │   └── LinkCard.tsx          # Link management card
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── profile/
│   │   ├── page.tsx
│   │   └── ProfileForm.tsx
│   ├── terms/page.tsx
│   ├── policy/page.tsx
│   ├── help/errors/page.tsx
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── download/[id]/route.ts
│   │   ├── links/save|edit|delete/
│   │   ├── auth/me|register|[...nextauth]/
│   │   ├── profile/update/
│   │   └── webrtc/signal/
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── not-found.tsx
│   ├── layout.tsx
│   └── providers.tsx
├── components/
│   ├── CookieConsentGate.tsx
│   ├── SessionCloseLogout.tsx
│   ├── LogoutButton.tsx
│   ├── UserAvatar.tsx
│   ├── LinkAccountButton.tsx
│   └── SiteFooter.tsx
├── lib/
│   ├── crypto.ts                 # AES-256-GCM, PBKDF2
│   ├── words.ts                  # Memorable passphrase generator
│   ├── auth.ts                   # NextAuth + Supabase auth
│   ├── db.ts                     # Prisma client
│   ├── supabase-auth.ts
│   ├── supabase-storage.ts
│   ├── security.ts               # Input validation, security headers
│   ├── rate-limit.ts
│   ├── csrf-client.ts
│   ├── csrf-shared.ts
│   └── prisma-errors.ts
└── middleware.ts                 # CSRF token management
```

### Planned Directory Additions
```
src/
├── app/
│   ├── chat/                     # Secure Chat UI
│   ├── groups/                   # Group Chat UI
│   ├── vault/                    # Full Zyphor Vault
│   ├── notes/                    # Secure Notes
│   ├── passwords/                # Password Manager
│   ├── calls/                    # Voice & Video
│   ├── settings/                 # Full settings panel
│   └── search/                   # Global search
├── lib/
│   ├── messaging.ts              # E2EE message crypto
│   ├── key-exchange.ts           # RSA/ECC key management
│   ├── vault.ts                  # Vault encryption layer
│   └── notifications.ts
└── hooks/
    ├── useChat.ts
    ├── useVault.ts
    └── usePresence.ts
```

---

## 7. Security Model

### Zero-Knowledge File Encryption (Live)
1. User selects files and a password (or auto-generated key).
2. Browser encrypts each file with AES-256-GCM using PBKDF2-derived key.
3. Only ciphertext, salt, and IV are uploaded to Supabase Storage.
4. Encryption password is shared out-of-band (URL hash, voice, text).
5. Server operator cannot decrypt files — keys never sent to backend.

### Planned Message Encryption
1. Each user generates an identity key pair (RSA-4096 or X25519) on first login.
2. Private key encrypted with user passphrase, stored locally (IndexedDB).
3. Public keys stored on server for key exchange.
4. Messages encrypted with per-conversation symmetric keys (Double Ratchet or similar).
5. Group messages use sender-key or MLS protocol.

### Auth Security (Live)
- Supabase Auth for email/password (primary)
- NextAuth JWT sessions (7-day max age)
- OAuth via Google & GitHub
- Rate limiting: 5 login attempts / 15 min, 20 uploads / 15 min
- CSRF double-submit cookie on all mutating API routes
- Cloudflare Turnstile in production
- Secure cookie flags in production

---

## 8. Development Roadmap

### Phase 1 — Foundation (Current) ✅
- E2EE file sharing (Zyphor Files)
- User auth & profile
- Dashboard with shared/saved links
- WebRTC P2P transfer
- Supabase migration (PostgreSQL + Storage + Auth)

### Phase 2 — Auth & Profile Completion
- Email verification, forgot/reset/change password
- Refresh tokens & Remember Me
- Username, bio, privacy settings
- Theme preference (dark/light mode)

### Phase 3 — Secure Chat
- 1:1 encrypted messaging
- Key exchange (RSA/ECC)
- Message features (reactions, reply, edit, delete)
- Read receipts, typing indicators, delivery status
- Real-time via WebSocket/Supabase Realtime

### Phase 4 — Group Chat
- Group creation, roles, moderation
- Group media gallery, shared files/links
- Invite links

### Phase 5 — Zyphor Vault
- Full personal encrypted storage
- Folders, tags, favorites, search
- Version history, offline cache
- Trash bin & restore

### Phase 6 — Notes & Password Manager
- E2EE secure notes (rich text, markdown, checklists)
- E2EE password manager with OTP support
- Password generator & strength indicator

### Phase 7 — Calls & Cross-Device
- Voice & video calls (WebRTC media)
- Screen sharing, meeting links
- Multi-device login, device management
- Message/file/settings sync

### Phase 8 — Productivity & Personalization
- Pinned/archive chats, scheduled messages
- Global search across all modules
- Full personalization (themes, wallpapers, sounds)
- Storage analytics & cleanup

### Phase 9 — Notifications & AI
- Push, email, desktop notifications
- AI chat/note summaries
- Smart search, spam/phishing detection
- Duplicate file detection

### Phase 10 — Enterprise
- Organization workspaces
- Shared team vaults & channels
- Compliance audit logs
- Enterprise SSO (SAML/OIDC)

---

## 9. Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | App base URL |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (storage) |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |

---

## 10. Legal

Proprietary software by **J Industries**. See `LICENSE` for terms.
