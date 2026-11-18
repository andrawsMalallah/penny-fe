import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'
import {
  changeScheduleState,
  getPending,
  getSchedules,
  resolveOccurrence,
  saveSchedule,
  scheduleTransaction,
  type RecurringSchedule,
  type ScheduleValues,
} from './recurring'
import { localDate } from './transactions'
vi.mock('./api', () => ({ apiRequest: vi.fn() }))
afterEach(() => vi.clearAllMocks())
const schedule = {
  id: 5,
  version: 7,
  kind: 'expense',
  account: 3,
  category: 2,
  currency: 'USD',
  amount: '9999999999999999.99',
  note: 'rent',
} as RecurringSchedule
describe('recurring requests', () => {
  it('keeps status filters and dates in bounded read requests', () => {
    getSchedules(2, 'paused')
    expect(apiRequest).toHaveBeenCalledWith('recurring/?page=2&state=paused')
    getPending(5, '2026-01-31')
    expect(vi.mocked(apiRequest).mock.calls[1]![0]).toContain('after=2026-01-31')
  })
  it('records only through an explicit guarded occurrence confirmation', () => {
    const values = scheduleTransaction(schedule)
    expect(values.date).toBe(localDate())
    expect(values.amount).toBe('9999999999999999.99')
    expect(values.destination).toBeNull()
    resolveOccurrence(schedule, '2026-01-31', values)
    expect(apiRequest).toHaveBeenCalledWith(
      'recurring/5/confirm/',
      expect.objectContaining({ version: 7, scheduled_date: '2026-01-31', transaction: values }),
    )
  })
  it('skips a slot with no transaction payload', () => {
    resolveOccurrence(schedule, '2026-01-31')
    expect(apiRequest).toHaveBeenCalledWith(
      'recurring/5/skip/',
      expect.objectContaining({ version: 7, scheduled_date: '2026-01-31' }),
    )
    expect(vi.mocked(apiRequest).mock.calls[0]![1]).not.toHaveProperty('transaction')
  })
  it('guards schedule create, updates and lifecycle mutations', () => {
    const values = { name: 'Rent', amount: '100.25' } as ScheduleValues
    saveSchedule(values, null, { request_id: 'fixed-memory-id' })
    expect(apiRequest).toHaveBeenCalledWith('recurring/', {
      ...values,
      request_id: 'fixed-memory-id',
    })
    saveSchedule(values, 5, { version: 7 })
    expect(apiRequest).toHaveBeenCalledWith('recurring/5/', { ...values, version: 7 })
    changeScheduleState(schedule, 'stopped')
    expect(apiRequest).toHaveBeenCalledWith(
      'recurring/5/state/',
      expect.objectContaining({ state: 'stopped', version: 7 }),
    )
  })
})
