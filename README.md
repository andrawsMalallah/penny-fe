# Penny frontend

Vue 3 SPA with TypeScript/Vite. Authentication includes registration, email verification, sign-in, verified profile/welcome, logout, email-code password recovery, signed-in devices with sign-out-all and optional authenticator 2FA. Arabic RTL/English LTR and System/Light/Dark themes follow the approved Penny design. Accounts/groups and opening balances are implemented; financial transactions and analytics are pending.

## Accounts

Authenticated workspace navigation includes lazy-loaded `#/accounts`. It supports money accounts, optional account groups, exact separate IQD/USD opening money, name/group edits, retained opening details and confirmed archive/restore. Settings includes an optional spending-default selector and link to Accounts. The initial-avatar menu still contains only Settings and Sign out.

AccountEditor separates form markup from AccountsPage coordination. AccountSelect and PageControls share bounded, fresh API selection/pagination, including current selections outside the visible page. No financial records are persisted in browser storage. Amount display groups decimal strings without converting to floating point. Copy is in `src/lib/accountCopy.ts`, styles in `src/styles/accounts.css`.

Current balances equal opening money; transactions, corrections, debts, targets and analytics are future work. Archiving retains money and clears the default; restoration does not automatically choose it again. A group with active accounts must be emptied/archived first. Opening amounts are recorded once at account creation.

Local verification: 52 tests plus lint/format/typecheck/production build; local simulated-API Chrome review of EN/AR, light/dark, 320px through desktop, validation, empty/error/retry, archive/restore and stale-CSRF behavior. Real-device acceptance remains pending. Browser tooling/artifacts stay outside this repository and CI.

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

Dark appearance uses a blue-charcoal canvas (`#080F14`), sidebar (`#0A1217`), header/bottom bar (`#0C171C`), raised cards (`#101B20`/`#152328`), emerald actions (`#087A49`) and mint accents (`#60DA9A`). Semantic tokens live in `theme.css`; the existing Light palette is retained. System follows the OS, and a small early HTML bootstrap applies appearance before first paint. Browser chrome updates with the selected appearance. No extra theme store or dependency is used.

The authenticated shell has a persistent sidebar at 1024px and above (236px wide; 208px on smaller desktops), with Overview, Accounts and Settings on every page. Below 1024px those same destinations move into a safe-area-aware bottom navigation; content/footer have reserved clearance. Guests have no authenticated navigation. `WorkspaceNavigation.vue`, `BrandWave.vue` and `OverviewPage.vue` share the visual language with the existing controls. `workspace.css` owns responsive shell/panel styling. Settings uses an inner desktop menu and a tappable phone section list. Its existing settings/security APIs and save semantics are preserved.

Overview reads one bounded page of current accounts and previews up to four, showing the server's total active-account count. It never presents partial-page amounts as aggregate money totals. Unsupported activity, analytics, notifications, search and OAuth controls are omitted. All decorative art is authored locally in SVG; the approved logo and existing font stacks are preserved.

The shell renders one shared AppFooter after main on every guest and authenticated page. It reuses the existing GuestFooter.vue file through the AppFooter import alias and shows @ Aether with the automatically computed year. The viewport-height flex shell and footer's automatic top margin keep it at the bottom of short pages, after content on long pages, without a fixed overlay. Check guest Home, authenticated Home, Settings and Devices when reviewing footer placement.

`App.vue` is the page shell. `AppHeader.vue` shows a circular user initial matching the 34px logo, with an accessible 44px account-menu button and no visible name/arrow. Its dropdown contains Settings and Sign out. `AuthFlow.vue` coordinates credential, verification, recovery and second-factor sign-in; `useWorkspaceSession.ts` owns authenticated identity/logout. `SettingsPage.vue` and the authenticated legacy `PreferencesPage.vue` remain lazy-loaded. `GuestFooter.vue` shows only @ Aether and the current year from the client's clock. `PreferenceControls.vue` serves authenticated settings only. `SelectControl.vue` retains native select behavior with a consistently inset SVG chevron, and `BackButton.vue`/`RefreshButton.vue` share secondary-action styling through `ControlIcon.vue`. Device-list refresh is an accessible circular-arrows icon beside the heading. Security Back actions are at the top; recovery-code screens still require acknowledging that codes have been saved. `AuthInput.vue` reuses accessible fields, `FactorCodeInput.vue` shares authenticator/recovery inputs and `useAuthFeedback.ts` shares translated error handling.

Startup makes one `GET /api/v1/auth/session/` request to restore verified identity, resume a pending second-factor sign-in or render the guest form. Guests are a normal HTTP 200 state; startup calls neither `auth/me/` nor a separate factor-pending status endpoint. The protected `auth/me/` endpoint remains in stale-CSRF diagnosis. No browser auth hints or cached identities are used. Non-interactive headings receive announcement focus without visible outlines; keyboard controls and focused error summaries retain their focus indicators.

Navigation uses hash URLs (`#/`, `#/settings`, `#/preferences`) with browser Back/Forward and direct reload support, without an additional routing package. Settings and the legacy preferences page require authentication; signed-out direct visits show sign-in without language/theme selectors. Guests use valid stored language/appearance choices; missing, invalid or unavailable localStorage defaults to English/System. Signed-in Settings fetches current account preferences on entry. Appearance applies immediately on this browser; Save settings persists language, default currency and an optional exchange rate to the account. Language also previews immediately. Currency may be left unselected and the rate blank. Rates cross the API as decimal strings, never floats; no financial preference values enter browser storage.

Settings acceptance on phone: open the circular initial menu, choose Settings, change language/theme, choose IQD/USD, enter a positive rate and Save settings. Reload and verify the saved account choices and absence of a heading highlight. Clear the rate and save again; test zero/negative/over-precision input. Open 2FA and signed-in devices from Security and return with Back. Test dropdown keyboard focus, Escape/outside dismissal, browser Back/Forward, Arabic RTL, both themes and signed-out preferences. Default spending account follows financial account creation.

Responsive layouts cover phone/landscape/tablet/desktop, safe areas, 16px minimum input text, touch-sized fields, keyboard focus, validation and explicit loading/errors. Arabic mirrors directional layout while preserving number/currency ordering. The old illustrative ledger and obsolete welcome component/copy were removed. Successful authentication now shows the real account Overview. Password visibility controls are explicit user actions and do not change authentication requests.

The final local fixture review passed 552 screen checks: eight widths (320/360/390/430/768/1024/1280/1440), EN/AR and Light/Dark, plus short/landscape viewports. It exercises registration, recovery, pending-factor login, recovery-code login, 2FA setup/one-time recovery display, settings persistence, accounts/groups/archive/restore, errors, confirmation/cancel and sign-out-all. QR rendering used public layout fixtures; actual scanning and real-phone keyboard/safe-area acceptance remain manual. A Node/Vitest `--localstorage-file` warning is present; tests still pass. No browser tests/tooling are added to deployment or CI.

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

2FA acceptance (after backend migration/key setup): open **Settings → Security → Two-factor authentication**, confirm the password, scan the QR in your authenticator app or copy the key into the app on the same phone, then verify its current code. Save all ten recovery codes outside Penny. Other sessions are signed out; this browser stays authenticated. Sign out and sign back in: the password alone must show the second-factor screen without private access. Test a fresh authenticator code, then an unused recovery code; replay must fail. A just-used authenticator code requires waiting for the next one. Check reload during the pending challenge, cancel, expiry, Arabic/English and both themes. Replace codes with password plus second factor and verify the old set stops working. Disabling also requires both proofs. Password reset keeps 2FA enabled and preserves unused recovery codes. Setup secrets, codes and QR data remain in component memory only and are cleared when leaving the screen; no third-party QR service or raw HTML is used.

Session acceptance (after the backend migration): sign in on two browsers/devices, open **Settings → Security → Signed-in devices**, and check browser/device labels, local times and **This device**. Older sessions appear on their next request without a known sign-in time. Refresh fetches current data; large lists use previous/next pages. Choose **Sign out all devices**, check Cancel first, then confirm. This browser returns to sign-in with a success message; reload the other browser and confirm access is denied. A subsequent sign-in should work. Check Arabic/English, both themes and phone widths. Mutations are never replayed automatically; an uncertain network result should be checked by reloading.
