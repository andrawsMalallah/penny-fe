import { apiRequest } from './api'
import type { RecordPage } from './accounts'
import { localDate, type Currency, type TransactionValues } from './transactions'

export type Frequency = 'weekly' | 'monthly' | 'yearly'
export type ScheduleState = 'active' | 'paused' | 'stopped'
export interface ScheduleValues {
  name: string
  kind: 'income' | 'expense'
  account: number
  category: number | null
  currency: Currency
  amount: string
  note: string
  frequency: Frequency
  start_date: string
  end_date: string | null
  timezone: string
}
export interface RecurringSchedule extends Omit<ScheduleValues, 'timezone'> {
  id: number
  version: number
  state: ScheduleState
  account_name: string
  account_archived: boolean
  opening_date: string
  category_name_en: string
  category_name_ar: string
  category_archived: boolean
}
export interface PendingPage {
  schedule: RecurringSchedule
  today: string
  results: string[]
  next_cursor: string | null
}
export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
export function getSchedules(page = 1, state = 'all'): Promise<RecordPage<RecurringSchedule>> {
  return apiRequest(`recurring/?${new URLSearchParams({ page: String(page), state })}`)
}
export function getSchedule(id: number): Promise<RecurringSchedule> {
  return apiRequest(`recurring/${id}/`)
}
export function getPending(id: number, after = ''): Promise<PendingPage> {
  const query = new URLSearchParams({ timezone: deviceZone() })
  if (after) query.set('after', after)
  return apiRequest(`recurring/${id}/pending/?${query}`)
}
export function saveSchedule(
  values: ScheduleValues,
  id: number | null,
  guard: { version: number } | { request_id: string },
): Promise<RecurringSchedule> {
  return apiRequest(`recurring/${id ? `${id}/` : ''}`, { ...values, ...guard })
}
export function changeScheduleState(
  schedule: RecurringSchedule,
  state: ScheduleState,
): Promise<RecurringSchedule> {
  return apiRequest(`recurring/${schedule.id}/state/`, {
    version: schedule.version,
    state,
    timezone: deviceZone(),
  })
}
export function resolveOccurrence(
  schedule: RecurringSchedule,
  scheduledDate: string,
  transaction?: TransactionValues,
): Promise<{ transaction: number | null }> {
  return apiRequest(`recurring/${schedule.id}/${transaction ? 'confirm' : 'skip'}/`, {
    version: schedule.version,
    scheduled_date: scheduledDate,
    timezone: deviceZone(),
    ...(transaction ? { transaction } : {}),
  })
}
export function scheduleTransaction(schedule: RecurringSchedule): TransactionValues {
  return {
    kind: schedule.kind,
    account: schedule.account,
    category: schedule.category,
    currency: schedule.currency,
    amount: schedule.amount,
    note: schedule.note,
    date: localDate(),
    destination: null,
    exchange_rate: null,
    received_amount: null,
    timezone: deviceZone(),
  }
}
