import { afterEach, describe, expect, it, vi } from 'vitest'
import { dateLabel, getTransactions, localDate, newRequestId } from './transactions'
import { ApiError, apiRequest } from './api'

afterEach(() => vi.unstubAllGlobals())
describe('transaction dates and API reads', () => {
  it('uses the local calendar rather than converting today to UTC', () => {
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02')
    expect(localDate(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17')
    expect(dateLabel('2026-01-02', 'en')).toMatch(/Jan 2, 2026/)
    expect(dateLabel('0001-02-01', 'en')).toBe('Feb 1, 1')
  })
  it('encodes only supplied filters and reads fresh server data', async () => {
    const result = { count: 0, results: [], next: null, previous: null }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)))
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await getTransactions(
        { account: '33', kind: 'expense', currency: 'USD', start: '2026-01-01', end: '' },
        2,
      ),
    ).toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/?page=2&account=33&kind=expense&currency=USD&start=2026-01-01',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', method: 'GET' }),
    )
  })
  it('uses native UUIDs in secure contexts', async () => {
    const randomUUID = vi.fn().mockReturnValue('11111111-1111-4111-8111-111111111111')
    vi.stubGlobal('crypto', { randomUUID })
    expect(await newRequestId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(randomUUID).toHaveBeenCalledOnce()
  })
  it('uses a standard server UUID on HTTP phone previews', async () => {
    vi.stubGlobal('crypto', {})
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ request_id: '11111111-1111-4111-8111-111111111111' })),
      )
    vi.stubGlobal('fetch', fetchMock)
    expect(await newRequestId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/request-id/',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
  it('keeps structured validation fields and suppresses raw errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            amount: ['Insufficient funds'],
            date: ['Too early'],
            destination: ['Unavailable account'],
            detail: 'Private exception',
          }),
          { status: 400 },
        ),
      ),
    )
    await expect(apiRequest('transactions/')).rejects.toEqual(
      new ApiError(400, {
        amount: ['Insufficient funds'],
        date: ['Too early'],
        destination: ['Unavailable account'],
      }),
    )
  })
  it('requests transfers for either-side account filtering without converting money', async () => {
    const result = {
      count: 1,
      results: [{ kind: 'transfer', account: 1, destination: 33, amount: '9999999999999999.99' }],
      next: null,
      previous: null,
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)))
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await getTransactions({
        account: '33',
        kind: 'transfer',
        currency: 'IQD',
        start: '',
        end: '',
      }),
    ).toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/?page=1&account=33&kind=transfer&currency=IQD',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    )
  })
})
