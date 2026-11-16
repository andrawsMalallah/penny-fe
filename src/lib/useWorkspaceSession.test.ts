import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type User } from './api'
import { useWorkspaceSession } from './useWorkspaceSession'

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), apiRequest: vi.fn() }))
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), ...mocks }))
const user: User = {
  id: 1,
  email: 'fixture@example.com',
  display_name: 'Test user',
  email_verified: true,
  language: 'en',
  timezone: 'UTC',
}
afterEach(() => vi.resetAllMocks())

describe('workspace session', () => {
  it('clears identity and returns home on logout', async () => {
    mocks.signOut.mockResolvedValue(undefined)
    const home = vi.fn()
    const session = useWorkspaceSession(ref(null), home)
    session.authenticated(user)
    await session.logout()
    expect(session.user.value).toBeNull()
    expect(home).toHaveBeenCalledOnce()
    expect(session.busy.value).toBe(false)
  })

  it('keeps identity on stale CSRF and never replays logout', async () => {
    mocks.signOut.mockRejectedValue(new ApiError(403, {}))
    mocks.apiRequest.mockResolvedValue(user)
    const session = useWorkspaceSession(ref(null), vi.fn())
    session.authenticated(user)
    await session.logout()
    expect(session.user.value).toEqual(user)
    expect(session.error.value).not.toBe('')
    expect(mocks.signOut).toHaveBeenCalledOnce()
  })

  it('clears expired identity when the authentication check also forbids access', async () => {
    mocks.signOut.mockRejectedValue(new ApiError(403, {}))
    mocks.apiRequest.mockRejectedValue(new ApiError(403, {}))
    const session = useWorkspaceSession(ref(null), vi.fn())
    session.authenticated(user)
    await session.logout()
    expect(session.user.value).toBeNull()
  })

  it('retains all-device sign-out feedback until authentication succeeds', () => {
    const session = useWorkspaceSession(ref(null), vi.fn())
    session.authenticated(user)
    session.finishSession(true)
    expect(session.signedOutEverywhere.value).toBe(true)
    session.authenticated(user)
    expect(session.signedOutEverywhere.value).toBe(false)
  })
})
