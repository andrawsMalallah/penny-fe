# Penny frontend

Vue 3 SPA with TypeScript/Vite. The first feature includes registration, email verification, sign-in, verified profile/welcome and logout. Arabic RTL/English LTR and System/Light/Dark themes follow the approved Penny design. Financial account setup, analytics, password reset and 2FA are pending.

## Development

Requires Node 24 or a compatible newer runtime. In this repository:

```powershell
npm ci
npm run dev
# Phone on the same Wi-Fi:
npm run dev:phone
```

Desktop: http://127.0.0.1:5173. Phone: `http://YOUR_PC_IPV4:5173`. Start the API on localhost:8000; its phone-preview launcher is documented in the backend README. Vite proxies `/api/` with same-origin cookie/CSRF behavior. Never place backend credentials in browser code or Vite environment variables.

API requests fetch fresh data with no-store; financial data must not be cached in browser storage. Only appearance/language preferences and the pending verification email are stored locally. CSRF tokens stay in memory, refresh after session authentication, and mutations are never automatically replayed.

## Design and review

Responsive layouts cover phone/landscape/tablet/desktop, safe areas, 16px minimum input text, touch-sized fields, keyboard focus, validation and explicit loading/errors. Arabic mirrors directional layout while preserving number/currency ordering. The illustrative balance panel is labeled Example and does not represent user funds. Successful authentication shows the actual profile and explains that account setup is next.

The approved logo is `public/logo.svg`. Font stacks use installed Plus Jakarta Sans/Noto Sans Arabic/Cairo and system fallbacks; bundled licensed fonts are pending.

## Checks

```powershell
npm run typecheck
npm run test
npm run lint
npm run format:check
npm run build
npm audit
```

The build includes TypeScript unused-local/parameter checks. Unit tests cover API freshness, credentials/CSRF, no replay of writes and raw-error suppression. Browser checks remain local, with no Playwright dependency or CI browser workflow.

Manual acceptance: register, receive/enter code, sign out, sign in and reload on a phone; check Arabic/English, light/dark/system, keyboard focus, field errors, expired/wrong codes and request limits.

Production hosting must route `/api/` to Django and SPA requests to the built frontend under one public origin. Production routing/deployment and CI are not configured.
