import { onScopeDispose, ref, watch } from 'vue'

export type Language = 'en' | 'ar'
export type Appearance = 'system' | 'light' | 'dark'

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const storedLanguage = readPreference('penny.language')
const storedAppearance = readPreference('penny.appearance')
export const language = ref<Language>(storedLanguage === 'ar' ? 'ar' : 'en')
export const appearance = ref<Appearance>(
  storedAppearance === 'light' || storedAppearance === 'dark' ? storedAppearance : 'system',
)

export function initializePreferences(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  function apply(): void {
    document.documentElement.lang = language.value
    document.documentElement.dir = language.value === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dataset.theme =
      appearance.value === 'system' ? (media.matches ? 'dark' : 'light') : appearance.value
    try {
      localStorage.setItem('penny.language', language.value)
      localStorage.setItem('penny.appearance', appearance.value)
    } catch {
      // Preferences still apply for this session if browser storage is unavailable.
    }
  }
  watch([language, appearance], apply, { immediate: true })
  media.addEventListener('change', apply)
  onScopeDispose(() => media.removeEventListener('change', apply))
}
