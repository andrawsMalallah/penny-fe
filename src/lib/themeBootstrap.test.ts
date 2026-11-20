import { describe, expect, it } from 'vitest'
import markup from '../../index.html?raw'
import bootstrap from '../../public/theme-bootstrap.js?raw'

function runInNewContext(script: string, environment: Record<string, unknown>): void {
  // Execute the actual local HTML bootstrap with isolated browser fixtures.
  new Function(...Object.keys(environment), script)(...Object.values(environment))
}
describe('appearance before first paint', () => {
  it('loads the local bootstrap synchronously without CSP inline-script permission', () => {
    expect(markup).toContain('<script src="/theme-bootstrap.js"></script>')
    expect(markup).not.toMatch(/<script>/)
  })
  it.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    ['system', true, 'dark'],
    [null, false, 'light'],
    ['invalid', true, 'dark'],
  ])('resolves %s with system dark=%s to %s', (stored, systemDark, expected) => {
    const root = { dataset: {} as Record<string, string> }
    expect(bootstrap).toBeTruthy()
    runInNewContext(bootstrap!, {
      document: { documentElement: root, querySelector: () => null },
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: systemDark }),
    })
    expect(root.dataset.theme).toBe(expected)
  })
  it('uses System when storage access is blocked', () => {
    const root = { dataset: {} as Record<string, string> }
    runInNewContext(bootstrap!, {
      document: { documentElement: root, querySelector: () => null },
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
      },
      matchMedia: () => ({ matches: true }),
    })
    expect(root.dataset.theme).toBe('dark')
  })
})
