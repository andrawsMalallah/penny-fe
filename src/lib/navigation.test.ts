import { describe, expect, it } from 'vitest'
import { pageFromHash } from './navigation'

describe('page navigation', () => {
  it('supports direct settings and signed-out preference URLs', () => {
    expect(pageFromHash('#/settings')).toBe('settings')
    expect(pageFromHash('#/accounts')).toBe('accounts')
    expect(pageFromHash('#/activity')).toBe('activity')
    expect(pageFromHash('#/debts')).toBe('debts')
    expect(pageFromHash('#/debts/33')).toBe('debts')
    expect(pageFromHash('#/debts/invalid')).toBe('home')
    expect(pageFromHash('#/preferences')).toBe('preferences')
    expect(pageFromHash('#/')).toBe('home')
    expect(pageFromHash('#/unknown')).toBe('home')
  })
})
