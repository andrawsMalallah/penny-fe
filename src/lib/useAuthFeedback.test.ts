import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { ApiError } from './api'
import { copy } from './copy'
import { language } from './preferences'
import { useAuthFeedback } from './useAuthFeedback'

vi.hoisted(() => {
  // Node 25 exposes experimental storage; these tests exercise in-memory feedback only.
  vi.stubGlobal('localStorage', { getItem: () => null })
})
afterAll(() => vi.unstubAllGlobals())

afterEach(() => {
  language.value = 'en'
})

describe('shared authentication feedback', () => {
  it('keeps sign-in rate limits distinct from code-request limits and focuses the error', async () => {
    const focus = vi.fn()
    const feedback = useAuthFeedback(ref({ focus } as unknown as HTMLElement))
    await feedback.showError(new ApiError(429, {}), 'login')
    expect(feedback.error.value).toBe(copy.value.loginRateLimit)
    await feedback.showError(new ApiError(429, {}), 'code')
    expect(feedback.error.value).toBe(copy.value.rateLimit)
    expect(focus).toHaveBeenCalledTimes(2)
  })

  it('clears old field errors on network failure and never displays raw exceptions', async () => {
    const feedback = useAuthFeedback(ref(null))
    await feedback.showError(new ApiError(400, { password: ['Choose a stronger password.'] }))
    expect(feedback.fieldError('password')).toBe('Choose a stronger password.')
    await feedback.showError(new Error('Private server or network details'))
    expect(feedback.fieldError('password')).toBeUndefined()
    expect(feedback.error.value).toBe(copy.value.connection)
  })

  it('uses invalid-code feedback for expired recovery and translates existing errors reactively', async () => {
    const feedback = useAuthFeedback(ref(null))
    await feedback.showError(new ApiError(400, { code: ['Expired recovery'] }))
    expect(feedback.error.value).toBe(copy.value.invalidCode)
    language.value = 'ar'
    expect(feedback.error.value).toBe(copy.value.invalidCode)
    expect(feedback.fieldError('code')).toBe(copy.value.validation)
    feedback.clearErrors()
    expect(feedback.error.value).toBe('')
    expect(feedback.fieldError('code')).toBeUndefined()
  })
})
