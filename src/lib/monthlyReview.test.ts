import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyReview } from './monthlyReview'
import { ApiError } from './api'

afterEach(() => vi.unstubAllGlobals())
describe('monthly review reads', () => {
  it('requests an explicit month, local timezone and bounded budget page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"activity":{"IQD":{"difference":"19999999999999999.97"}}}'))
    vi.stubGlobal('fetch', fetchMock)
    expect((await getMonthlyReview('2026-01', 2)).activity.IQD.difference).toBe(
      '19999999999999999.97',
    )
    const [url, options] = fetchMock.mock.calls[0]!
    const query = new URL(url, 'https://example.com').searchParams
    expect(query.get('month')).toBe('2026-01')
    expect(query.get('page')).toBe('2')
    expect(query.get('timezone')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(options).toMatchObject({ method: 'GET', cache: 'no-store', credentials: 'same-origin' })
  })
  it('does not replay failed reads or expose raw errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{"month":["Invalid month"],"detail":"Private exception"}', { status: 400 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    await expect(getMonthlyReview('bad')).rejects.toEqual(
      new ApiError(400, { month: ['Invalid month'] }),
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
