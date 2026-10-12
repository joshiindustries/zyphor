# Zyphor frontend

React 18 + Vite single-page app. The public homepage is static and rendered without mounting the authenticated application provider. It does not call the backend. Existing login, student, staff, and exam experiences remain in the client.

## Local development

From the repository root, start the backend first, then:

```powershell
Set-Location frontend
npm ci
$env:VITE_BASE = "/"
$env:VITE_API_BASE = "http://localhost:8080"
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173/`. For a production build served under the backend at `/app/`, omit `VITE_BASE` (Vite config defaults to `/app/`) and run `npm run build`. For Vercel, the build command sets `VITE_BASE=/` and the project settings must provide the HTTPS `VITE_API_BASE` value.

`VITE_API_BASE` is public configuration, not a secret. Do not put credentials or private keys in `VITE_*` variables. The laptop startup script updates `public/backend.json` with the healthy Cloudflare Quick Tunnel URL and publishes that frontend configuration. A Quick Tunnel URL changes when its tunnel is replaced.

## Feature upgrade

The student Skill Passport summarizes released results and topic performance, offers revocable sharing links, and provides post-exam study guidance through laptop-hosted Ollama. Students can challenge questions in their own completed, released paper; authorized event admins review appeals and the backend recalculates marks.

The admin console includes reusable assessment templates, future question revision history, and accommodations configured before an attempt. Extra time and approved camera alternatives are enforced by the backend. Reading scale, contrast, and dialog keyboard controls are available throughout the frontend.

Deploy the matching backend before publishing these frontend features. A successful frontend build does not prove compiler execution, camera detection, Moodle integration, or 300-participant capacity. Those live checks are tracked in the laptop repository's `docs/feature-upgrade-status.md`.
