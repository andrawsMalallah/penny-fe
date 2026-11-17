import { afterEach, describe, expect, it, vi } from 'vitest'
import { debtIdFromHash, getDebts, getRepayments, groupedDebts, type Debt } from './debts'
import { ApiError, apiRequest } from './api'

afterEach(() => vi.unstubAllGlobals())
describe('private debt reads and navigation', () => {
  it('uses explicit bounded filters and fresh same-origin reads', async () => {
    const result = { count: 0, results: [], next: null, previous: null }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)))
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await getDebts({ person: '33', currency: 'USD', direction: 'i_owe', status: 'all' }, 2),
    ).toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/debts/?page=2&person=33&currency=USD&direction=i_owe&status=all',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' }),
    )
  })
  it('keeps repayment histories bounded to the requested debt page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ count: 0, results: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await getRepayments(33, 2)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/debts/33/repayments/?page=2',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
  it.each([
    ['#/debts/33', 33],
    ['#/debts', null],
    ['#/debts/0', null],
    ['#/debts/no', null],
    ['#/debts/9007199254740992', null],
  ] as const)('validates Activity link %s', (hash, id) => {
    expect(debtIdFromHash(hash)).toBe(id)
  })
  it('groups by person without netting directions or mixing currency amounts', () => {
    const records = [
      {
        id: 1,
        person_name: 'Rima',
        currency: 'IQD',
        direction: 'owed_to_me',
        remaining: '9999999999999999.99',
      },
      { id: 2, person_name: 'Rima', currency: 'USD', direction: 'i_owe', remaining: '20.01' },
      { id: 3, person_name: 'Sam', currency: 'IQD', remaining: '50.00' },
    ] as Debt[]
    const groups = groupedDebts(records)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.[1]).toEqual(records.slice(0, 2))
    expect(groups[0]?.[1][0]?.remaining).toBe('9999999999999999.99')
  })
  it('keeps debt validation fields while hiding raw exceptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            person: ['Choose a person'],
            person_name: ['Name required'],
            direction: ['Invalid'],
            origin: ['Invalid'],
            amount: ['Too much'],
            detail: 'Private exception',
          }),
          { status: 400 },
        ),
      ),
    )
    await expect(apiRequest('debts/')).rejects.toEqual(
      new ApiError(400, {
        person: ['Choose a person'],
        person_name: ['Name required'],
        direction: ['Invalid'],
        origin: ['Invalid'],
        amount: ['Too much'],
      }),
    )
  })
})
