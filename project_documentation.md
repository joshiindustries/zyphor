# VaultShare Project Documentation

## 1. Overview
VaultShare is a secure, modern file-sharing web application designed with a focus on End-to-End Encryption (E2EE) and user privacy. It allows users to securely upload and share files, employing multiple password protection strategies, download tracking, and live peer-to-peer (P2P) transfer capabilities.

## 2. Tech Stack Setup
The project is built using the following core technologies:
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript, React 18
- **Styling:** Custom CSS with Lucide React for iconography
- **Database:** SQLite via `better-sqlite3`
- **Authentication:** NextAuth.js (v4)
- **Security:** Web Crypto API (Client-side AES-GCM encryption)
- **Networking:** WebRTC for live P2P file transfers

## 3. Core Features

### 3.1. End-to-End Encryption (E2EE)
- **Client-Side Processing:** All files are encrypted within the user's browser *before* being uploaded to the server. The server never sees the raw file content or the encryption key.
- **Algorithm:** Uses AES-256-GCM for encryption and PBKDF2 (with SHA-512) for key derivation from passwords.
- **Salting & IVs:** A random 16-byte salt and 12-byte initialization vector (IV) are generated for each transfer.

### 3.2. Secure Sharing Options
Users can share files with various encryption strategies:
- **Auto-Link:** Generates a secure key and automatically embeds it into the share link (e.g., `#key`).
- **Memorable Passphrase:** Generates a set of readable words (e.g., `correct-horse-battery`) intended to be shared out-of-band (via text or voice).
- **Random Complex Key:** Generates a strong, 16-character alphanumeric password.
- **Custom Password:** Users can choose their own encryption password.
- **Live P2P Transfer (WebRTC):** Establishes a direct browser-to-browser connection for transferring files without permanently storing them on a server.

### 3.3. Transfer Controls & Tracking
- **Burn After Reading:** Allows the sender to enforce a strict limit of one successful download before the file is permanently shredded and the link is disabled.
- **Save to Vault:** Senders can toggle `allow_save`. If enabled, recipients with an account can save a reference of the shared file into their personal "Vault" dashboard for future access.
- **Custom Link Aliases:** Senders can create custom-named URL slugs (e.g., `vaultshare.com/my-secret-file`).

### 3.4. User Accounts & Vault Dashboard
- **Authentication:** Supports user registration, login, and secure session management.
- **Dashboard/Vault:** Authenticated users have a personal space where they can manage their created links, view download counts, and access files they have saved from other users.
- **Guest Restrictions:** Unauthenticated "Guest" users can still upload files, but these transfers are not saved to a persistent vault and have limited tracking capabilities.

## 4. Architecture & Database Schema
The database runs on `better-sqlite3` storing both application schema and metadata securely on the server. The actual encrypted file blobs are stored on the local file system (in the `uploads/` directory).

### Key Database Tables:
- **`users`:** Stores user profile info (ID, name, email, password hash, etc.).
- **`accounts`:** Used by NextAuth for OAuth provider relationships.
- **`links`:** Represents a shared link session. Tracks `user_id`, `expires_at`, `max_downloads`, `current_downloads`, and `allow_save` status.
- **`files`:** Related to `links`. Stores metadata for each uploaded file: `size`, `original_name`, `storage_path` (location on disk), `salt`, and [iv](file:///f:/LAPTOP/share%20file%20anti/src/lib/crypto.ts#10-34).
- **`saved_links`:** A join table tracking which files a user has saved to their personal vault (`user_id`, `link_id`).
- **`webrtc_signals`:** A temporary mechanism to exchange SDP offers/answers and ICE candidates to facilitate the WebRTC P2P handshake.

## 5. Directory Structure Mapping
- [src/app/page.tsx](file:///f:/LAPTOP/share%20file%20anti/src/app/page.tsx): Main upload interface handling local encryption, WebRTC flows, and UI state.
- `src/app/dashboard/`: Authenticated user vault, file management, and link tracking.
- `src/app/[id]/`: The dynamic download page where recipients download and decrypt files.
- `src/app/api/upload/`: Handles incoming encrypted blobs and persists database records.
- `src/app/api/webrtc/`: The signaling server routes for P2P connection establishment.
- `src/lib/crypto.ts`: Core cryptographic utilities mapping Web Crypto functions.
- `src/lib/db.ts`: Database instantiation and schema definitions.
- `src/lib/words.ts`: Utility for generating memorable passphrases.

## 6. Security Model Considerations
- E2EE ensures zero-knowledge for the server operator regarding file contents.
- Because encryption keys are never sent to the backend, if a user loses their share link or password, the files are cryptographically unrecoverable.
- WebRTC P2P connections are established using standard WebRTC security (DTLS-SRTP), and signaling acts only as a rendezvous point.
