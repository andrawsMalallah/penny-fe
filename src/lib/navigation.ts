import { onScopeDispose, ref } from 'vue'

export type Page =
  'home' | 'settings' | 'preferences' | 'accounts' | 'activity' | 'debts' | 'analytics' | 'budgets'

export function pageFromHash(hash: string): Page {
  if (/^#\/debts(?:\/[1-9]\d*)?$/.test(hash)) return 'debts'
  if (hash.split('?')[0] === '#/activity') return 'activity'
  if (hash === '#/analytics') return 'analytics'
  if (hash === '#/budgets') return 'budgets'
  if (hash === '#/accounts') return 'accounts'
  if (hash === '#/settings') return 'settings'
  if (hash === '#/preferences') return 'preferences'
  return 'home'
}

export function useNavigation() {
  const page = ref<Page>(pageFromHash(window.location.hash))
  const update = (): void => {
    page.value = pageFromHash(window.location.hash)
  }
  window.addEventListener('hashchange', update)
  onScopeDispose(() => window.removeEventListener('hashchange', update))
  function navigate(value: Page): void {
    page.value = value
    window.location.hash = value === 'home' ? '/' : `/${value}`
    window.scrollTo(0, 0)
  }
  return { page, navigate }
}
