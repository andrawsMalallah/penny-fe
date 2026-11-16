import { describe, expect, it } from 'vitest'
import { pageFromHash } from './navigation'

describe('page navigation', () => {
  it('supports direct settings and signed-out preference URLs', () => {
    expect(pageFromHash('#/settings')).toBe('settings')
    expect(pageFromHash('#/preferences')).toBe('preferences')
    expect(pageFromHash('#/')).toBe('home')
    expect(pageFromHash('#/unknown')).toBe('home')
  })
})
