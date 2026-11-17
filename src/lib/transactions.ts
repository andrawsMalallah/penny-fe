import { apiRequest } from './api'
import type { RecordPage } from './accounts'

export type TransactionKind = 'income' | 'expense'
export type Currency = 'IQD' | 'USD'
export interface TransactionValues {
  account: number | null
  category: number | null
  kind: TransactionKind
  currency: Currency | ''
  amount: string
  date: string
  note: string
  timezone: string
}
export interface MoneyTransaction extends Omit<TransactionValues, 'timezone'> {
  id: number
  account: number
  currency: Currency
  version: number
  account_name: string
  account_archived: boolean
  category_name_en: string
  category_name_ar: string
  category_archived: boolean
  opening_date: string
}
export interface ActivityFilters {
  account: string
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
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en', {
    dateStyle: 'medium',
  }).format(new Date(year!, month! - 1, day!, 12))
}
export async function newRequestId(): Promise<string> {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // HTTP phone previews lack randomUUID; use Python's standard UUID generator.
  return (await apiRequest<{ request_id: string }>('transactions/request-id/')).request_id
}
