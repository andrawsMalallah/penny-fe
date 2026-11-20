/* global document, localStorage, matchMedia */
// Synchronous local bootstrap resolves appearance before styles/SPA paint; no inline script is needed.
try {
  const stored = localStorage.getItem('penny.appearance')
  document.documentElement.dataset.theme =
    stored === 'dark' || stored === 'light'
      ? stored
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
} catch {
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
document
  .querySelector('meta[name="theme-color"]')
  ?.setAttribute(
    'content',
    document.documentElement.dataset.theme === 'dark' ? '#0c171c' : '#0e7051',
  )
