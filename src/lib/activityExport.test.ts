import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { getActivityCsv, getExportCount, saveActivityCsv } from './activityExport'

const filters = {
  account: '32',
  category: '4',
  kind: 'expense' as const,
  currency: 'USD' as const,
  start: '2026-01-01',
  end: '',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Activity CSV downloads', () => {
  it('counts all applied filters without pagination or extra client properties', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"count":33}'))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getExportCount({ ...filters, page: 2 } as typeof filters)).toEqual({ count: 33 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/export/count/?account=32&category=4&kind=expense&currency=USD&start=2026-01-01',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' }),
    )
  })
  it('downloads bytes without parsing money, with language and reviewed count', async () => {
    const csv = '\ufeffالتاريخ,المبلغ\r\n2026-01-01,9999999999999999.99\r\n'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    expect(await (await getActivityCsv(filters, 'ar', 33, controller.signal)).text()).toBe(
      csv.slice(1),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/export/?account=32&category=4&kind=expense&currency=USD&start=2026-01-01&language=ar&expected_count=33',
      expect.objectContaining({
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin',
      }),
    )
  })
  it('reports stale count, forbidden and server failures without downloading or retrying', async () => {
    for (const status of [409, 403, 500]) {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response('{"detail":"Private exception"}', { status }))
      vi.stubGlobal('fetch', fetchMock)
      await expect(getActivityCsv(filters, 'en', 33, new AbortController().signal)).rejects.toEqual(
        new ApiError(status, {}),
      )
      expect(fetchMock).toHaveBeenCalledOnce()
    }
  })
  it('rejects unexpected success content and interrupted reads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>sign in</html>')))
    await expect(getActivityCsv(filters, 'en', 33, new AbortController().signal)).rejects.toEqual(
      new ApiError(502, {}),
    )
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    await expect(
      getActivityCsv(filters, 'en', 33, new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('uses a temporary file link and releases its memory after the browser starts', () => {
    vi.useFakeTimers()
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const append = vi.fn()
    const createObjectURL = vi.fn().mockReturnValue('blob:fixture')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('window', {
      document: { createElement: vi.fn().mockReturnValue(link), body: { append } },
      setTimeout,
    })
    const document = new Blob(['fixture'])
    saveActivityCsv(document, 'ar')
    expect(createObjectURL).toHaveBeenCalledWith(document)
    expect(link.download).toBe('penny-activity-ar.csv')
    expect(link.click).toHaveBeenCalledOnce()
    expect(link.remove).toHaveBeenCalledOnce()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fixture')
  })
})
