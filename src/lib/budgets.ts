import { apiRequest } from './api'
import type { RecordPage } from './accounts'
import type { ExpenseCategory } from './categories'
import type { Currency } from './transactions'
import { activityLink } from './analytics'

export interface BudgetMoney {
  limit: string | null
  spent: string
  remaining: string | null
  over: boolean
}
export interface BudgetRow extends Omit<ExpenseCategory, 'id'> {
  category: number
  month: string
  version: number
  recurring: boolean
  IQD: BudgetMoney
  USD: BudgetMoney
}
export interface BudgetValues {
  month: string
  version: number
  scope: 'month' | 'future'
  limit_iqd: string | null
  limit_usd: string | null
}
export function getBudgets(month: string, page = 1): Promise<RecordPage<BudgetRow>> {
  return apiRequest(`budgets/?${new URLSearchParams({ month, page: String(page) })}`)
}
export function getBudget(category: number, month: string): Promise<BudgetRow> {
  return apiRequest(`budgets/${category}/?${new URLSearchParams({ month })}`)
}
export function saveBudget(category: number, values: BudgetValues): Promise<BudgetRow> {
  return apiRequest(`budgets/${category}/`, values)
}
export function budgetActivityLink(row: BudgetRow, currency: Currency): string {
  const [year, month] = row.month.split('-').map(Number)
  const days = new Date(year!, month!, 0, 12).getDate()
  return activityLink({
    category: String(row.category),
    kind: 'expense',
    currency,
    start: `${row.month}-01`,
    end: `${row.month}-${days}`,
  })
}
