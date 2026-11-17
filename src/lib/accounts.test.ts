import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatMoney, getAccountPage } from './accounts'

afterEach(() => vi.unstubAllGlobals())
describe('account money and reads', () => {
  it('preserves cents across the full supported precision without floating point', () => {
    expect(formatMoney('9999999999999999.99')).toBe('9,999,999,999,999,999.99')
    expect(formatMoney('0.01')).toBe('0.01')
    expect(formatMoney('1000.10')).toBe('1,000.10')
    expect(formatMoney('0.00')).toBe('0.00')
  })
  it('reads explicit pages and archive status with no browser financial cache', async () => {
    const response = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 8, name: 'Savings', archived: true }],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getAccountPage('accounts', 2, true)).toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/accounts/?page=2&archived=true',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin', method: 'GET' }),
    )
  })
})
