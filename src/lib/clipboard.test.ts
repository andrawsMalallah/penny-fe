import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyElementText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

const fixtureElement = { textContent: 'public-test-setup-key' } as HTMLElement

function fallbackBrowser(outcome: boolean | Error) {
  let selectedText = 'previous selection'
  const originalRange = { text: selectedText }
  let selectedElement: HTMLElement | null = null
  let copiedText = ''
  const selection = {
    rangeCount: 1,
    getRangeAt: () => ({ cloneRange: () => originalRange }),
    removeAllRanges: () => {
      selectedText = ''
    },
    addRange: (range: object) => {
      selectedText =
        range === originalRange ? originalRange.text : (selectedElement?.textContent ?? '')
    },
  }
  const clipboard = { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }
  vi.stubGlobal('navigator', { clipboard })
  vi.stubGlobal('window', { isSecureContext: false, getSelection: () => selection })
  vi.stubGlobal('document', {
    createRange: () => ({
      selectNodeContents: (element: HTMLElement) => {
        selectedElement = element
      },
    }),
    execCommand: () => {
      copiedText = selectedText
      if (outcome instanceof Error) throw outcome
      return outcome
    },
  })
  return { clipboard, copiedText: () => copiedText, selectedText: () => selectedText }
}

describe('user-requested text copy', () => {
  it('preserves one recovery code per line with either clipboard path', async () => {
    const recoveryElement = {
      textContent: 'first-fixture-code\nsecond-fixture-code',
    } as HTMLElement
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', { isSecureContext: true })
    expect(await copyElementText(recoveryElement)).toBe(true)
    expect(writeText).toHaveBeenCalledWith('first-fixture-code\nsecond-fixture-code')
    const browser = fallbackBrowser(true)
    expect(await copyElementText(recoveryElement)).toBe(true)
    expect(browser.copiedText()).toBe('first-fixture-code\nsecond-fixture-code')
  })
  it('copies the exact setup key with the secure Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('window', { isSecureContext: true })
    expect(await copyElementText(fixtureElement)).toBe(true)
    expect(writeText).toHaveBeenCalledWith('public-test-setup-key')
  })

  it('supports HTTP previews and restores the previous selection', async () => {
    const browser = fallbackBrowser(true)
    expect(await copyElementText(fixtureElement)).toBe(true)
    expect(browser.copiedText()).toBe('public-test-setup-key')
    expect(browser.selectedText()).toBe('previous selection')
    expect(browser.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('falls back when secure clipboard access is denied', async () => {
    const browser = fallbackBrowser(true)
    vi.stubGlobal('window', { ...window, isSecureContext: true })
    expect(await copyElementText(fixtureElement)).toBe(true)
    expect(browser.copiedText()).toBe('public-test-setup-key')
  })

  it.each([false, new Error('Copy blocked')])(
    'reports blocked copying without losing selection (%s)',
    async (outcome) => {
      const browser = fallbackBrowser(outcome)
      expect(await copyElementText(fixtureElement)).toBe(false)
      expect(browser.selectedText()).toBe('previous selection')
    },
  )
})
