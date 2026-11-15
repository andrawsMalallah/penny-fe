import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('browser API contract', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

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
})
