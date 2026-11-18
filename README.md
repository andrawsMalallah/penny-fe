# Penny frontend

Vue 3 SPA with TypeScript/Vite. Authentication includes registration, email verification, sign-in, verified profile/welcome, logout, email-code password recovery, signed-in devices with sign-out-all and optional authenticator 2FA. Arabic RTL/English LTR and System/Light/Dark themes follow the approved Penny design. Accounts/groups, opening balances, categories, Activity, transfers, exchanges, debts, repayments, account targets and analytics are implemented.

## Analytics

Lazy private `#/analytics` shows current money held, debts owed-to-me/I-owe and net position for both currencies, including archived accounts. “As of now” stays separate from selected-period income/spending/difference and previous-period comparison. Default is This month; Previous month, This year and Custom range apply explicitly. Report currency changes between separate IQD/USD views without conversion or another request. Six-month income/spending charts always end in the current month; exact accessible tables accompany charts. Category shares use the full currency spending total, never a partial-page sum. Accounts/groups/category/person breakdowns are paginated; current accounts can display saved targets.

Account links open complete matching Activity for that currency; category links include category/expense/currency and the applied period. The category picker includes archived categories. Hash parsing/Back/Forward preserves drill-down filters; Clear replaces the URL so reload does not restore stale filters. Older delayed GETs cannot replace newer route filters, and route changes reload bounded selected choices. All data is fresh API state in memory; no financial browser storage or automatic mutation replay. Failed report refresh clears old report cards and offers retry.

Six consistent destinations are available in the sidebar/phone nav with >=44px targets. At <=360px, Overview/Analytics use visual Home/Reports labels, retaining full accessible names; inputs remain >=16px. SVG charts use existing semantic palette values with exact tables; no packages/fonts added. Arabic RTL/English LTR and Light/Dark/System reuse existing preferences.

Local checks: 101 frontend tests and all lint/format/typechecked production-build gates; 72 Analytics responsive screens and interactions plus 384 Activity/transfer/exchange/debt regression screens. Actual EN/AR Light/Dark screenshots inspected including 320px. Existing non-failing Node/Vitest localStorage warning remains. Browser artifacts remain local outside repos/CI; physical-device acceptance is manual. Review Analytics periods/currencies, compare balances with Accounts/Debts, follow category/account links, and try both languages/themes on phone and desktop.

Audit follow-up: retrying a failed period change retries that requested period; Refresh still uses the last successfully applied period. The regression harness covers a failed Previous month request followed by Retry. Full `npm audit` reports 13 high-severity dependency paths for the existing build/test-tool `picomatch` advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf); production-only `npm audit --omit=dev` reports zero vulnerabilities. No financial-input route to glob tooling was identified in this scoped review, and the built SPA does not include picomatch. The advisory currently lists no patched release. No packages were changed or forced/downgraded; revisit toolchain remediation separately.

## Account targets

Accounts → Add/Edit account has optional independent IQD/USD targets. Enter positive two-decimal amounts; leave a field empty to remove that target. Target cards display the current balance, goal and exact remaining amount; progress bars stop at 100% and show Target reached at or above the goal. Progress follows the current currency balance, so spending/corrections can lower it again. Targets never reserve money or limit spending. Accounts without goals stay uncluttered; archives retain their goals.

Shared AccountTarget and exact BigInt cents calculations avoid floating-point money. Saves include the read target version; a 409 asks the user to cancel/refresh/reopen, with no automatic mutation replay. Recognized target validation errors reach their fields. Fresh account API reads drive progress; no financial browser storage, packages or navigation destinations were added.

Local verification: 94 frontend tests plus lint/format/typechecked production build; 48 target responsive screens and existing Accounts regression checks (32 screens) in EN/AR, Light/Dark, phone/tablet/desktop, with actual screenshots inspected. Target interactions cover create/edit/remove, maximum precision, validation, conflict, stale CSRF without replay, refreshed balance decline, Cancel focus, archive retention and guests. Existing non-failing Node/Vitest localStorage warning remains. Browser checks stay local outside CI. On a phone, edit both targets, remove one, verify progress/reached status against balances, and recheck after a money change; also try Arabic and both themes.

## Debts and repayments

Authenticated `#/debts` is lazy-loaded and appears consistently in the desktop sidebar and five-item phone navigation. Lists group the current bounded page by person with independent direction/currency/remaining amounts; there are no partial-page totals or netting. Explicit Apply/Clear filters cover person, direction, currency and outstanding/settled/all status. People and repayment histories are paginated too. Existing debts record the original date without moving money; new lending/borrowing links an explicitly selected account and updates its balance.

Debt detail shows original, repaid and remaining amounts plus repayment history. Add/edit debt and repayment panels are lazy-loaded, share DebtEntryFields and existing transaction-editor styles, and preserve English/Arabic, exact string money, local-today fixed dates, account context/readiness/retry and keyboard focus. No spending account/currency defaults are silently applied. Person selection supports bounded existing choices or a new trimmed name. Repayments use the debt's fixed currency; the account label explicitly says pay from or receive into.

Editing/deletion is guarded by last-read versions, and create drafts retain a memory-only UUID for explicit retries. Repayment mutations refresh detail/history and debt versions. Corrections cannot reduce a debt below its repayments; remove repayments before changing debt currency/direction or deleting the debt. All linked money changes must preserve historical account balances. Confirmed deletion keeps the confirmation visible on failure. No financial records or drafts are persisted in browser storage; no automatic mutation replay.

Activity shows linked debt cash rows and safe person/role labels, with a **Manage in Debts** deep link (`#/debts/<id>`) instead of generic edit/delete controls. The backend enforces that separation. Guests cannot open private debt screens. Main navigation, browser routing, direct links and Cancel/Back focus are covered locally.

Current verification: **90 frontend tests**, lint/format/typechecked production build pass; **15 date/debt tests** also pass under America/Los_Angeles. Public-fixture lifecycle/error/retry checks and **144 debt responsive screen checks** pass across EN/AR, Light/Dark and 320/390/768/844 landscape/1024/1440. Existing Activity/transfer/exchange suites contribute another **240 responsive checks** plus interactions. Real screenshots inspected in all four language/theme combinations including 320px. Browser testing/artifacts stay local outside the repo/CI. Existing non-failing Node/Vitest localStorage warning remains. Physical-device acceptance is manual.

Manual acceptance on phone/desktop: add an existing old debt and verify cash stays unchanged; record new lending and borrowing and check the correct account movement. Add partial/full repayments, check remaining amounts and one person with separate IQD/USD debts. Edit and cancel/confirm deletion; test overpayment, old/future dates, changing currency with repayments, and deleting supporting cash that was spent. Open linked Activity → Manage in Debts, then check filters/pagination, English/Arabic, System/Light/Dark, portrait/landscape, keyboard/calendar/zoom and five-tab touch targets.

## Currency exchanges

Activity → **Exchange currency** converts IQD ↔ USD within one account. Choose account, paid currency/amount, date and optional note. A saved Settings rate is required for a new exchange; the form prefills it and allows an override for this exchange only. An existing exchange opens with its recorded rate, even if Settings later changes/clears. No default account/currency is silently chosen.

**Review exchange** shows the account, paid amount, calculated received amount/currency, actual rate, fixed date and optional note before **Confirm exchange** can write. The preview uses exact BigInt rational arithmetic, rounding received cents half-up, and the backend recomputes it with Decimal. Zero/unsupported results cannot be reviewed. Change details returns to the populated form; Cancel/Back leaves the draft. No preview mutation/API call is sent. Create retries retain the same memory-only UUID and reviewed snapshot, with no automatic replay.

Activity shows one exchange with paid/received legs and actual rate, excluded from income/spending. Currency filters match either leg. Edit and confirmed deletion recheck both histories atomically, so spent received funds may prevent a correction/deletion. Shared choices, readiness/retry, version conflicts, CSRF and no-financial-storage rules remain unchanged.

Current local verification: **81 frontend tests**, lint/format/typechecked production build and 26 date/exchange tests under America/Los_Angeles. The exact preview has 20 rounding/bounds tests. Public-fixture exchange interactions and **96 list/editor/review/deletion responsive checks** pass across EN/AR, Light/Dark and 320/390/768/844 landscape/1024/1440. Existing Activity/transfer regressions are recorded in the root exchange review. Screenshots inspected including 320px. Browser tools/artifacts stay outside the repo/CI. Existing non-failing Node/Vitest localStorage warning remains. Physical-device acceptance is separate.

Manual acceptance on phone/desktop: save a rate in Settings, open Exchange currency, review then confirm USD → IQD and IQD → USD. Check both balances and one Activity entry. Override a rate, then verify Settings and prior exchanges stay unchanged. Test halfway rounding (1 IQD at 200 gives 0.01 USD), zero-rounding rejection, insufficient funds, edit/confirmed deletion and cancellation. Spend received funds and verify removing the supporting exchange is rejected. Check Arabic/English, System/Light/Dark, portrait/landscape and keyboard/calendar/zoom behavior.

## Account transfers

In Activity choose **Transfer money**. Select distinct From/To accounts, one IQD/USD currency, amount, fixed date and optional note. Transfer defaults stay empty; spending defaults are not applied. The earliest date is the later of both opening dates. Both account reads and paginated choices must succeed before saving. Same-account selection explains the issue and disables saving. The server remains authoritative for historical funds and archived references.

Activity shows one neutral transfer amount, both account names and archive labels. The account filter matches incoming and outgoing transfers, and Type includes Transfer. Edit/confirmed deletion reuse the version/UUID retry and focus/error behavior. A destination field error is sanitized and linked to its control. No financial records are persisted in browser storage, and mutations are never automatically replayed.

Current verification: **61 unit tests**, ESLint/Prettier and Vue/TypeScript production build pass. Local public-fixture transfer interactions cover create/edit/delete, historical-funds rejection, cancel/focus, same-account guards, explicit same-ID retry, stale CSRF without replay, conflict, either-side filtering, paginated/archived destinations and failed choice/context recovery. **72 transfer list/editor/confirmation checks** and the **72 existing Activity regression checks** pass across EN/AR, Light/Dark and 320/390/768/844 landscape/1024/1440. Screenshots inspected, including 320px. Existing non-failing Node/Vitest localStorage warning remains. Browser tooling stays local outside this repo/CI. Actual phone acceptance is pending.

Manual acceptance: on phone and desktop open Activity, transfer a small IQD amount between two accounts, then check both balances in Accounts/Overview and filter Activity by the destination. Repeat in USD; IQD must remain unchanged. Edit amount/account/date, cancel then confirm deletion, and check both sides. Try the same account twice, too much money and dates before either opening. Spend transferred funds and verify deleting/reducing the supporting transfer is rejected. Check Arabic/English, Light/Dark/System, portrait/landscape and keyboard focus.

## Income, expenses and Activity

Authenticated `#/activity` is lazy-loaded and appears consistently in desktop/sidebar and phone/bottom navigation. Add income or expense with account, currency, exact decimal-string amount, Gregorian date and optional note; expenses require a category. Expense defaults come freshly from Settings and can be overridden. Missing defaults stay empty. Category starters initialize idempotently through a CSRF-protected POST when opening an editor. No transaction data is persisted in browser storage.

The form defaults to local today, exposes the fixed account opening date and blocks future/prior-opening dates. The API remains authoritative: income counts before expenses on the same day, and backdating/correction/deletion must keep all later balances nonnegative. Saved dates do not shift across timezones. Account/Overview displays refetch live ledger-derived balances on entry. Opening money stays separate in Accounts and never appears as income.

Activity has bounded history and explicit Apply/Clear account, type, currency and date filters; typing does not issue requests. Shared AccountSelect handles bounded account/category choices, archived historical filters, selections beyond page one and readiness/retry. Saving stays disabled until choices and account context load successfully. Existing archived references remain available when correcting their transaction. Edit uses a fresh detail/version; confirmed deletion updates balances. Cancel/Back restore focus. All mutation errors preserve the draft or confirmation; uncertain writes are never replayed automatically. A create draft retains a memory-only request UUID for an explicit retry, including a standard server UUID fallback on HTTP previews. Stale edits return a refresh instruction instead of overwriting.

Local verification: **60 unit tests**, ESLint/Prettier, Vue/TypeScript production build, and date tests under America/Los_Angeles. Public API fixture browser checks cover creation/default overrides/missing defaults, edits, confirmed deletion and rejected deletion, validation, conflicts, stale CSRF, failed response plus same-request explicit retry, filtering/pagination, failed pickers/account reads with retry, archived corrections, focus/navigation/guest protection and no financial browser storage. **72 responsive list/filter/editor checks** cover EN/AR, Light/Dark and 320/390/768/844 landscape/1024/1440 viewports; real screenshots inspected in each language/theme. Browser checks are local only. Physical phone acceptance remains pending; Node/Vitest's existing non-failing localStorage warning remains.

Manual acceptance: open Activity on phone/desktop, add income and a categorized expense, check separate IQD/USD balances in Accounts and Overview, edit/delete with confirmation and test cancellation. Check defaults/overrides, blank defaults, backdating from the opening date, insufficient funds on a later date, filters/refresh, EN/AR, Light/Dark/System and keyboard/portrait/landscape. Try deleting income that supports a later expense; it must fail without balance changes.

## Expense categories

Open **Settings → Expense categories** to manage eight editable bilingual starters and custom categories. First entry performs a CSRF-protected, idempotent initialization POST, then reads the current bounded API page. Categories are never stored in browser storage. Create/edit requires at least one English/Arabic name; display follows the selected language and falls back to the available name. Each input has an explicit writing direction. Names are unique per user and language, including archived categories.

Archive/restore requires confirmation; Cancel returns focus to its action. Archived categories cannot be edited until restored, and renamed/archived starters do not reappear. Panels/editor are lazy-loaded and reuse shared fields, buttons, pagination and feedback. RefreshButton accepts an optional label, preserving its existing signed-in-device default.

Verification: 55 unit tests, lint, formatting and production build/typecheck pass. Local public-fixture browser checks cover create/edit, optional translation fallback, duplicate/blank names, confirmation/cancel/focus, archive/restore, stale CSRF without mutation replay, retry, pagination and guest protection. Another 48 list/editor screen checks cover EN/AR, Light/Dark and 320/390/768/844 landscape/1024/1440 widths; screenshots were inspected in both languages/themes. Physical phone acceptance remains manual. No browser tooling is added to CI/deployment.

Manual acceptance: on a phone and desktop open Settings → Expense categories, check the eight starters, add a category with one name, rename it with both names, switch language, archive/cancel/confirm/restore, and reload to confirm starters remain edited. Try duplicate names, including an archived category, and check Light/Dark/System, portrait/landscape, keyboard and Back focus.

## Accounts

Authenticated workspace navigation includes lazy-loaded `#/accounts`. It supports money accounts, optional account groups, exact separate IQD/USD opening money, name/group edits, retained opening details and confirmed archive/restore. Settings includes an optional spending-default selector and link to Accounts. The initial-avatar menu still contains only Settings and Sign out.

AccountEditor separates form markup from AccountsPage coordination. AccountSelect and PageControls share bounded, fresh API selection/pagination, including current selections outside the visible page. No financial records are persisted in browser storage. Amount display groups decimal strings without converting to floating point. Copy is in `src/lib/accountCopy.ts`, styles in `src/styles/accounts.css`.

Current balances include opening money, income/expenses, transfers, exchanges and actual debt cash movements. Income/expense/transfer/exchange/debt corrections are supported; targets and analytics remain future work. Archiving retains money and clears the default; restoration does not automatically choose it again. A group with active accounts must be emptied/archived first. Opening amounts and dates are fixed at creation; existing opening dates are populated by the reviewed backend migration.

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

The authenticated shell has a persistent sidebar at 1024px and above (236px wide; 208px on smaller desktops), with Overview, Accounts, Activity and Settings on every page. Below 1024px those same destinations move into a safe-area-aware bottom navigation; content/footer have reserved clearance. Guests have no authenticated navigation. `WorkspaceNavigation.vue`, `BrandWave.vue` and `OverviewPage.vue` share the visual language with the existing controls. `workspace.css` owns responsive shell/panel styling. Settings uses an inner desktop menu and a tappable phone section list. Its existing settings/security APIs and save semantics are preserved.

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
