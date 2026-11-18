import { apiRequest } from './api'
import type { RecordPage } from './accounts'
import type { ActivityFilters, Currency } from './transactions'

export type ReportPeriod = 'this_month' | 'previous_month' | 'this_year' | 'custom'
export interface ReportFilters {
  period: ReportPeriod
  start: string
  end: string
}
export type BreakdownSection = 'accounts' | 'groups' | 'categories' | 'people'
export interface BreakdownRow {
  id?: number
  name?: string
  archived?: boolean
  group?: number | null
  group_name?: string | null
  balance_iqd?: string
  balance_usd?: string
  target_iqd?: string | null
  target_usd?: string | null
  category?: number
  category_name_en?: string
  category_name_ar?: string
  category_archived?: boolean
  person?: number
  person_name?: string
  IQD?: string
  USD?: string
  owed_to_me_IQD?: string
  owed_to_me_USD?: string
  i_owe_IQD?: string
  i_owe_USD?: string
}
export interface ActivityTotals {
  income: string
  expense: string
  difference: string
  previous_income: string
  previous_expense: string
  income_change: string
  expense_change: string
}
export interface TrendMonth {
  month: string
  IQD: { income: string; expense: string }
  USD: { income: string; expense: string }
}
export interface AnalyticsReport {
  as_of: string
  period: {
    key: ReportPeriod
    start: string
    end: string
    previous_start: string
    previous_end: string
    today: string
  }
  current: Record<Currency, { held: string; owed_to_me: string; i_owe: string; net: string }>
  activity: Record<Currency, ActivityTotals>
  trends: TrendMonth[]
  breakdowns: Record<BreakdownSection, RecordPage<BreakdownRow>>
}
export function reportQuery(filters: ReportFilters): URLSearchParams {
  const query = new URLSearchParams({
    period: filters.period,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  if (filters.period === 'custom') {
    query.set('start', filters.start)
    query.set('end', filters.end)
  }
  return query
}
export function getAnalytics(filters: ReportFilters): Promise<AnalyticsReport> {
  return apiRequest(`analytics/?${reportQuery(filters)}`)
}
export function getBreakdown(
  section: BreakdownSection,
  filters: ReportFilters,
  page: number,
): Promise<RecordPage<BreakdownRow>> {
  const query = reportQuery(filters)
  query.set('page', String(page))
  return apiRequest(`analytics/${section}/?${query}`)
}
export function cents(amount: string): bigint {
  const negative = amount.startsWith('-')
  const [integer = '0', fraction = ''] = amount.replace(/^-/, '').split('.')
  const result = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'))
  return negative ? -result : result
}
export function reportPercent(amount: string, total: string): number {
  const numerator = cents(amount),
    denominator = cents(total)
  if (denominator <= 0n || numerator <= 0n) return 0
  return numerator >= denominator ? 100 : Number((numerator * 10000n) / denominator) / 100
}
export function activityLink(filters: Partial<ActivityFilters>): string {
  const query = new URLSearchParams()
  for (const field of ['account', 'category', 'kind', 'currency', 'start', 'end'] as const) {
    const value = filters[field]
    if (value) query.set(field, value)
  }
  return query.size ? `#/activity?${query}` : '#/activity'
}
export function monthLabel(value: string, language: 'en' | 'ar'): string {
  const [year, month] = value.split('-').map(Number)
  const calendar = new Date(0)
  calendar.setFullYear(year!, month! - 1, 1)
  calendar.setHours(12, 0, 0, 0)
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en', {
    month: 'short',
    year: 'numeric',
  }).format(calendar)
}
