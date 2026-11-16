# Penny frontend

Vue 3 SPA with TypeScript/Vite. Authentication includes registration, email verification, sign-in, verified profile/welcome, logout, email-code password recovery, signed-in devices with sign-out-all and optional authenticator 2FA. Arabic RTL/English LTR and System/Light/Dark themes follow the approved Penny design. Financial account setup and analytics are pending.

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

`App.vue` is the page shell. `AppHeader.vue` owns language/appearance controls; `AuthFlow.vue` coordinates authentication and composes the credential form, verification form and welcome panel. Password recovery, `SessionPanel.vue`, `SecondFactorForm.vue` and `TwoFactorPanel.vue` stay lazy-loaded. `AuthInput.vue` reuses accessible field markup, `FactorCodeInput.vue` shares authenticator/recovery inputs and `useAuthFeedback.ts` shares translated error handling across the flows.

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

The build includes TypeScript unused-local/parameter checks. Unit tests cover API freshness, credentials/CSRF, no replay of writes, raw-error suppression and shared authentication feedback. Browser checks remain local, with no Playwright dependency or CI browser workflow.

Manual acceptance: register, receive/enter code, sign out, sign in and reload on a phone; check Arabic/English, light/dark/system, keyboard focus, field errors, expired/wrong codes and request limits.

Recovery acceptance (after applying the backend migration): sign in on two browsers/devices, then use **Forgot your password?** on the sign-in page of another browser/private window. Enter the account email, use the latest emailed six-digit code, choose and confirm a different strong password, and return to sign-in. The old password must fail, the new password must work, and both earlier sessions must lose private access on reload. Check resend, wrong/expired codes, mismatched passwords and both languages/themes. Recovery proof stays in the server-side browser session and expires with the original ten-minute code; reloading the page starts the UI again, so request a new code if needed.

Production hosting must route `/api/` to Django and SPA requests to the built frontend under one public origin. Production routing/deployment and CI are not configured.

2FA acceptance (after backend migration/key setup): open **Two-factor authentication** from the welcome panel, confirm the password, scan the QR with Google Authenticator or copy the key into the app on the same phone, then verify its current code. Save all ten recovery codes outside Penny. Other sessions are signed out; this browser stays authenticated. Sign out and sign back in: the password alone must show the second-factor screen without private access. Test a fresh authenticator code, then an unused recovery code; replay must fail. A just-used authenticator code requires waiting for the next one. Check reload during the pending challenge, cancel, expiry, Arabic/English and both themes. Replace codes with password plus second factor and verify the old set stops working. Disabling also requires both proofs. Password reset keeps 2FA enabled and preserves unused recovery codes. Setup secrets, codes and QR data remain in component memory only and are cleared when leaving the screen; no third-party QR service or raw HTML is used.

Session acceptance (after the backend migration): sign in on two browsers/devices, open **Signed-in devices** from the welcome panel, and check browser/device labels, local times and **This device**. Older sessions appear on their next request without a known sign-in time. Refresh fetches current data; large lists use previous/next pages. Choose **Sign out all devices**, check Cancel first, then confirm. This browser returns to sign-in with a success message; reload the other browser and confirm access is denied. A subsequent sign-in should work. Check Arabic/English, both themes and phone widths. Mutations are never replayed automatically; an uncertain network result should be checked by reloading.
