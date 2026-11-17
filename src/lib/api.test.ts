import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('browser API contract', () => {
  it('preserves target validation fields and excludes unknown server details', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'target-fixture' })))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              target_iqd: ['Enter a positive target.'],
              target_usd: ['Use a decimal string.'],
              target_version: ['Refresh the account.'],
              trace: ['private fixture'],
            }),
            { status: 400 },
          ),
        ),
    )
    const { apiRequest } = await import('./api')
    await expect(apiRequest('accounts/1/', {})).rejects.toMatchObject({
      fields: {
        target_iqd: ['Enter a positive target.'],
        target_usd: ['Use a decimal string.'],
        target_version: ['Refresh the account.'],
      },
    })
  })
  it.each([
    { user: null, two_factor_pending: false },
    { user: null, two_factor_pending: true },
    { user: { id: 1, display_name: 'Public fixture' }, two_factor_pending: false },
  ])('loads startup state with one guest-safe request: %j', async (state) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(state)))
    vi.stubGlobal('fetch', fetchMock)
    const { getSessionState } = await import('./api')
    expect(await getSessionState()).toEqual(state)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/session/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })
  })

  it('does not fall back to me or silently treat a failed startup request as a guest', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const { getSessionState } = await import('./api')
    await expect(getSessionState()).rejects.toMatchObject({ status: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('sends exact settings strings and nullable rates without financial browser caching', async () => {
    const values = { language: 'ar', default_currency: 'USD', exchange_rate: '1310.123456' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'settings-fixture' })))
      .mockResolvedValueOnce(new Response(JSON.stringify(values)))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await import('./api')
    expect(await apiRequest('settings/', values)).toEqual(values)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/settings/')
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body)).toEqual(values)
    expect(fetchMock.mock.calls[1]?.[1].cache).toBe('no-store')
  })

  it('exposes only recognized settings validation fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'settings-fixture' })))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              exchange_rate: ['Enter a positive rate.'],
              default_currency: ['Choose IQD or USD.'],
              trace: ['private fixture'],
            }),
            { status: 400 },
          ),
        ),
    )
    const { apiRequest } = await import('./api')
    await expect(apiRequest('settings/', {})).rejects.toMatchObject({
      fields: {
        exchange_rate: ['Enter a positive rate.'],
        default_currency: ['Choose IQD or USD.'],
      },
    })
  })

  it('refreshes CSRF after navbar logout before the next mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-logout' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'after-logout' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const { signOut, signIn } = await import('./api')
    await signOut()
    await signIn('fixture@example.com', 'Public test phrase 918!')
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('after-logout')
  })
  it('returns a second-factor challenge without treating it as a profile and refreshes CSRF', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-password' })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ two_factor_required: true }), { status: 202 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-factor' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'authenticated' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { signIn, verifySecondFactor, apiRequest } = await import('./api')
    expect(await signIn('test@example.com', 'Private test phrase 389!')).toEqual({
      two_factor_required: true,
    })
    expect(await verifySecondFactor('123456', false)).toEqual({ id: 1 })
    await apiRequest('auth/logout/', {})
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('before-factor')
    expect(fetchMock.mock.calls[5]?.[1].headers['X-CSRFToken']).toBe('authenticated')
  })

  it('refreshes CSRF after a 2FA settings change renews the current session', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-change' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'after-change' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { factorMutation, apiRequest } = await import('./api')
    await factorMutation('disable', { otp: '123456', password: 'test fixture' })
    await apiRequest('auth/logout/', {})
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('after-change')
  })

  it('preserves structured factor errors without repeating a failed verification', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'token' })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ otp: ['Invalid code'] }), { status: 400 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { verifySecondFactor } = await import('./api')
    await expect(verifySecondFactor('123456', false)).rejects.toMatchObject({
      status: 400,
      fields: { otp: ['Invalid code'] },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('refreshes CSRF after signing out all devices before another sign-in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'old-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'new-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const { signOutAll, signIn } = await import('./api')
    await signOutAll()
    await signIn('test@example.com', 'Private test phrase 592!')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/logout-all/')
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('new-token')
  })

  it('does not automatically repeat a failed sign-out-all mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'token' })))
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    const { signOutAll } = await import('./api')
    await expect(signOutAll()).rejects.toThrow('Network unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loads each session page fresh using only the local API path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] })),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { getSessions } = await import('./api')
    await getSessions(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/sessions/?page=2')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })
  })

  it('refreshes CSRF after signing out all devices before a new sign-in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-revocation' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'after-revocation' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const { signOutAll, signIn } = await import('./api')
    await signOutAll()
    await signIn('test@example.com', 'Test sign-in password phrase')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/logout-all/')
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('after-revocation')
  })

  it('never automatically retries a failed sign-out-all request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'token' })))
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const { signOutAll } = await import('./api')
    await expect(signOutAll()).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fetches CSRF before a mutation and sends cookie credentials', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'masked-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'sent' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await import('./api')
    await apiRequest('auth/register/', { email: 'test@example.com' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-CSRFToken': 'masked-token' },
    })
  })

  it('fetches current user data on each request without a browser cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ display_name: 'Before' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ display_name: 'After' })))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await import('./api')
    expect(await apiRequest('auth/me/')).toMatchObject({ display_name: 'Before' })
    expect(await apiRequest('auth/me/')).toMatchObject({ display_name: 'After' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toMatchObject({ cache: 'no-store', credentials: 'same-origin' })
    }
  })

  it('does not replay a mutation rejected by CSRF', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'old-token' })))
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await import('./api')
    await expect(apiRequest('auth/register/', {})).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('discards raw server failures and unrecognized response fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>private trace</html>', { status: 500 })),
    )
    const { apiRequest } = await import('./api')
    await expect(apiRequest('auth/me/')).rejects.toMatchObject({ status: 500, fields: {} })
  })

  it('refreshes CSRF after verification rotates the authenticated session', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-login' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'after-login' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest, verifyEmail } = await import('./api')
    await verifyEmail('123456')
    await apiRequest('auth/logout/', {})
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('after-login')
  })

  it('refreshes CSRF after password sign-in before the next write', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'before-login' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'after-login' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest, signIn } = await import('./api')
    await signIn('test@example.test', 'test fixture input')
    await apiRequest('auth/logout/', {})
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('after-login')
  })

  it('refreshes CSRF after password recovery ends the session before sign-in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'recovery-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'fresh-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const { resetPassword, signIn } = await import('./api')
    await resetPassword('New test password phrase 572!')
    await signIn('test@example.com', 'New test password phrase 572!')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/password-reset/complete/')
    expect(fetchMock.mock.calls[3]?.[1].headers['X-CSRFToken']).toBe('fresh-token')
  })

  it('does not retry a failed recovery mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: ['Expired'] }), { status: 400 }))
    vi.stubGlobal('fetch', fetchMock)
    const { resetPassword } = await import('./api')
    await expect(resetPassword('New test password phrase 572!')).rejects.toMatchObject({
      status: 400,
      fields: { code: ['Expired'] },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
