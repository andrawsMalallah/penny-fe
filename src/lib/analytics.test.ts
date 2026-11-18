import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  activityLink,
  cents,
  getAnalytics,
  getBreakdown,
  monthLabel,
  reportPercent,
  reportQuery,
} from './analytics'
import { activityFiltersFromHash } from './activityRoute'
import { pageFromHash } from './navigation'

afterEach(() => vi.unstubAllGlobals())
describe('analytics precision and report navigation', () => {
  it('formats early calendar years without shifting them into the twentieth century', () => {
    expect(monthLabel('0001-01', 'en')).toBe('Jan 1')
    expect(monthLabel('2026-11', 'en')).toBe('Nov 2026')
  })
  it('keeps exact signed aggregate amounts above single-account capacity', () => {
    expect(cents('19999999999999999.98')).toBe(1999999999999999998n)
    expect(cents('-100.01')).toBe(-10001n)
    expect(reportPercent('9999999999999999.98', '9999999999999999.99')).toBe(99.99)
    expect(reportPercent('0.01', '0.03')).toBe(33.33)
  })
  it('handles zero and full distribution without money conversion or division errors', () => {
    expect(reportPercent('0.00', '0.00')).toBe(0)
    expect(reportPercent('500.00', '1000.00')).toBe(50)
    expect(reportPercent('1500.00', '1000.00')).toBe(100)
    expect(reportPercent('-1.00', '100.00')).toBe(0)
  })
  it('sends only preset period and device timezone, excluding stale custom dates', () => {
    const query = reportQuery({ period: 'this_month', start: '2020-01-01', end: '2020-01-31' })
    expect(query.get('period')).toBe('this_month')
    expect(query.get('timezone')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(query.has('start')).toBe(false)
    expect(query.has('end')).toBe(false)
  })
  it('encodes fixed custom dates without UTC shifting', () => {
    const query = reportQuery({ period: 'custom', start: '2026-01-01', end: '2026-01-31' })
    expect(query.get('start')).toBe('2026-01-01')
    expect(query.get('end')).toBe('2026-01-31')
    expect(monthLabel('2026-01', 'en')).toBe('Jan 2026')
  })
  it('uses fresh bounded GETs for reports and subsequent section pages', async () => {
    const response = { count: 0, results: [] }
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(response))))
    vi.stubGlobal('fetch', fetchMock)
    await getAnalytics({ period: 'this_month', start: '', end: '' })
    await getBreakdown('people', { period: 'previous_month', start: '', end: '' }, 2)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /^\/api\/v1\/analytics\/\?period=this_month&timezone=/,
    )
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(
      /analytics\/people\/\?period=previous_month&timezone=.*&page=2$/,
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })
  })
  it('opens exact category-period-currency activity and restores it from the hash', () => {
    const link = activityLink({
      category: '15',
      kind: 'expense',
      currency: 'USD',
      start: '2026-11-01',
      end: '2026-11-18',
    })
    expect(pageFromHash(link)).toBe('activity')
    expect(activityFiltersFromHash(link)).toEqual({
      account: '',
      category: '15',
      kind: 'expense',
      currency: 'USD',
      start: '2026-11-01',
      end: '2026-11-18',
    })
    expect(pageFromHash('#/analytics')).toBe('analytics')
    expect(activityFiltersFromHash(activityLink({ account: '42', currency: 'IQD' })).account).toBe(
      '42',
    )
  })
  it('drops unknown fields, malformed IDs, currencies and route types', () => {
    expect(
      activityFiltersFromHash(
        '#/activity?account=-1&category=oops&currency=BTC&kind=all&user=2&start=bad',
      ),
    ).toEqual({ account: '', category: '', kind: '', currency: '', start: '', end: '' })
    expect(activityFiltersFromHash('#/analytics?account=1').account).toBe('')
    expect(activityLink({ account: '1', category: '' })).toBe('#/activity?account=1')
    expect(activityLink({})).toBe('#/activity')
  })
})
