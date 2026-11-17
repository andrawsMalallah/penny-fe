import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('browser preference defaults', () => {
  it('follows system changes only while System is selected and removes its listener', async () => {
    const { effectScope, nextTick } = await import('vue')
    let change = () => {}
    const remove = vi.fn()
    const media = {
      matches: true,
      addEventListener: (_name: string, callback: () => void) => {
        change = callback
      },
      removeEventListener: remove,
    }
    const root = { dataset: {} as Record<string, string>, lang: '', dir: '' }
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    vi.stubGlobal('window', { matchMedia: () => media })
    vi.stubGlobal('document', { documentElement: root, querySelector: () => null })
    const { initializePreferences, appearance, language } = await import('./preferences')
    const scope = effectScope()
    scope.run(initializePreferences)
    expect(root.dataset.theme).toBe('dark')
    media.matches = false
    change()
    expect(root.dataset.theme).toBe('light')
    appearance.value = 'dark'
    language.value = 'ar'
    await nextTick()
    change()
    expect(root.dataset.theme).toBe('dark')
    expect(root.dir).toBe('rtl')
    expect(root.lang).toBe('ar')
    scope.stop()
    expect(remove).toHaveBeenCalledWith('change', change)
  })
  it('defaults to English and System when storage has no preferences', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    const { language, appearance } = await import('./preferences')
    expect(language.value).toBe('en')
    expect(appearance.value).toBe('system')
  })

  it('preserves existing language and appearance choices', async () => {
    const stored: Record<string, string> = { 'penny.language': 'ar', 'penny.appearance': 'dark' }
    vi.stubGlobal('localStorage', { getItem: (key: string) => stored[key] ?? null })
    const { language, appearance } = await import('./preferences')
    expect(language.value).toBe('ar')
    expect(appearance.value).toBe('dark')
  })

  it('uses safe defaults for unsupported stored values', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'unsupported' })
    const { language, appearance } = await import('./preferences')
    expect(language.value).toBe('en')
    expect(appearance.value).toBe('system')
  })

  it('uses defaults when browser storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Storage blocked')
      },
    })
    const { language, appearance } = await import('./preferences')
    expect(language.value).toBe('en')
    expect(appearance.value).toBe('system')
  })
})
