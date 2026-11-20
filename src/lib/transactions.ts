import { apiRequest } from './api'
import type { RecordPage } from './accounts'

export type TransactionKind =
  'income' | 'expense' | 'transfer' | 'exchange' | 'debt_in' | 'debt_out'
export type Currency = 'IQD' | 'USD'
export interface TransactionValues {
  account: number | null
  destination: number | null
  category: number | null
  kind: TransactionKind
  currency: Currency | ''
  amount: string
  exchange_rate: string | null
  received_amount: string | null
  date: string
  note: string
  timezone: string
}
export interface MoneyTransaction extends Omit<TransactionValues, 'timezone'> {
  debt: number | null
  debt_role: '' | 'principal' | 'repayment'
  debt_person_name: string
  id: number
  account: number
  currency: Currency
  version: number
  account_name: string
  account_archived: boolean
  destination_name: string
  destination_archived: boolean
  destination_opening_date: string | null
  category_name_en: string
  category_name_ar: string
  category_archived: boolean
  opening_date: string
}
export interface ActivityFilters {
  account: string
  category?: string
  kind: TransactionKind | ''
  currency: Currency | ''
  start: string
  end: string
}
export function getTransactions(
  filters: ActivityFilters,
  page = 1,
): Promise<RecordPage<MoneyTransaction>> {
  const query = new URLSearchParams({ page: String(page) })
  for (const [field, value] of Object.entries(filters)) if (value) query.set(field, value)
  return apiRequest(`transactions/?${query}`)
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function dateLabel(value: string, language: 'en' | 'ar'): string {
  // Construct the calendar date locally; parsing YYYY-MM-DD as UTC shifts it in western zones.
  const [year, month, day] = value.split('-').map(Number)
  const calendar = new Date(0)
  calendar.setFullYear(year!, month! - 1, day!)
  calendar.setHours(12, 0, 0, 0)
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en', {
    dateStyle: 'medium',
  }).format(calendar)
}
export async function newRequestId(): Promise<string> {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // HTTP phone previews lack randomUUID; use Python's standard UUID generator.
  return (await apiRequest<{ request_id: string }>('transactions/request-id/')).request_id
}
