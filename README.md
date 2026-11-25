# Penny frontend

React, TypeScript, and Vite static frontend for the Penny Django API.

## Local run

Use Node 22.12 or newer. Start the backend from `backend/` with `.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload`. Then, from `frontend/`:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:3000/`. Vite proxies `/api/v1/` to the local backend, preserving same-origin session cookies and CSRF. No Gemini API key or frontend `.env` file is needed for this app.

## Checks and build

```powershell
npm test
npm run lint
npm run build
npm audit
```

## Static deployment contract

Run `npm ci` and `npm run build`, then publish only `dist/` as the site root. The build has no frontend server, runtime environment variables, CDN fonts, or external icon dependency. Serve the site over HTTPS for installable PWA support, including `manifest.webmanifest`, `sw.js`, SVG, PNG, CSS, JavaScript, and font assets.

The public HTTPS origin must route `/api/v1/` to the Django backend. Keep the browser-facing API on the same origin so session cookies and CSRF requests work. The Vite `/api` proxy works only during local development and is absent from `dist/`. The static host must serve `index.html` for the app entry; hash navigation stays on that page. Do not cache API responses in the static asset layer. Backend host, proxy, cookie, and CSRF settings must match the final public HTTPS origin before accepting a deployment.

Before publishing, verify sign-in and MFA, account and transaction writes, debts, budgets, recurring actions, CSV export, pagination, English/Arabic RTL, light/dark/System, and PWA installation on a real phone. Local builds and unit tests do not establish hosted integration or production readiness.
