# Zyphor frontend

React 18 + Vite single-page app. The public homepage is static and rendered without mounting the authenticated application provider. It does not call the backend. Existing login, student, staff, and exam experiences remain in the client.

## Local development

From the repository root, start the backend first, then:

Use Node.js 22.12 or newer (the laptop verification used Node 24). The lockfile includes a gRPC 1.x security patch override for Firebase's transitive dependency; Firebase sign-in remains optional and is not enabled by updating the SDK.

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

Exam Results includes assessment analytics: distributions, topic performance, per-question presentation/answer/full-mark rates and protected CSV exports. Statistics use the paper each participant actually received and show sample-size warnings.

Passing released results in the Skill Passport provide private certificate PDFs and optional 30-day verification links. Students can replace/revoke links; changed marks, recalled results and disabled accounts invalidate verification. The verifier checks the current Zyphor record and matching PDF identifier, without claiming independent accreditation.

The Aa menu includes low-bandwidth mode. It reduces optional health checks from every 20 seconds to every minute and minimizes animation. Autosave, exam heartbeat, camera monitoring and manual rechecks continue normally.

## Moodle Learning Hub

Student and Coordinator dashboards include **Moodle Learning Hub**; Admin and Superadmin use the organization's Learning Hub in the console. A Superadmin links published Moodle courses, then event admins assign enrolled students and link Zyphor assessments. **Open Moodle course** uses signed LTI 1.3 SSO without sharing the Zyphor password. The browser must allow the course window.

Moodle assessment links return to `/lti/launch` using a short-lived, single-use handoff. Backend checks bind the real identity, course, exam and session; Moodle claims cannot promote a user's Zyphor role. Released marks synchronize through LTI Advantage AGS, with retry controls in the hub. Moodle grades use a 0–100 scale and appear separately from original Zyphor marks/reports. Unreleased or recalled results remain protected on the backend.

Deploy the matching laptop backend and Moodle connector before this frontend. Managed laptop startup refreshes the tunnel, Moodle registrations and `public/backend.json`. Private keys and connector credentials remain on the laptop. Quick Tunnel URLs are temporary; restarting the laptop does not provide continuous service while it is offline.

Deploy the matching backend before publishing these frontend features. A successful frontend build does not prove compiler execution, camera detection, Moodle integration, or 300-participant capacity. Those live checks are tracked in the laptop repository's `docs/feature-upgrade-status.md`.
