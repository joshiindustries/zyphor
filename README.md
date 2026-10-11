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

`VITE_API_BASE` is public configuration, not a secret. Do not put credentials or private keys in `VITE_*` variables. `public/backend.json` is empty by default so no temporary tunnel address is baked into the deployment.
