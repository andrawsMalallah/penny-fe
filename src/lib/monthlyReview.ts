import { apiRequest } from './api'
import type { ActivityTotals, BreakdownRow } from './analytics'
import type { RecordPage } from './accounts'
import type { BudgetRow } from './budgets'
import type { Currency } from './transactions'

export interface MonthlyTotals extends ActivityTotals {
  previous_difference: string
  difference_change: string
}
export interface MonthlyReview {
  as_of: string
  period: {
    month: string
    timezone: string
    today: string
    start: string
    end: string
    previous_start: string
    previous_end: string
    incomplete: boolean
  }
  activity: Record<Currency, MonthlyTotals>
  top_categories: Record<Currency, BreakdownRow[]>
  budgets: RecordPage<BudgetRow>
}
export function getMonthlyReview(month: string, page = 1): Promise<MonthlyReview> {
  return apiRequest(
    `analytics/monthly/?${new URLSearchParams({
      month,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: String(page),
    })}`,
  )
}
