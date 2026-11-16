import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('browser preference defaults', () => {
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
