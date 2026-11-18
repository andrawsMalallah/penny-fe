import { describe, expect, it, vi, afterEach } from 'vitest'
import { budgetActivityLink, getBudget, getBudgets, saveBudget, type BudgetRow } from './budgets'
import { apiRequest } from './api'
vi.mock('./api', () => ({ apiRequest: vi.fn() }))
afterEach(() => vi.clearAllMocks())
describe('budget requests and drill-downs', () => {
  it('keeps the selected month and explicit pagination', () => {
    getBudgets('2026-02', 2)
    expect(apiRequest).toHaveBeenCalledWith('budgets/?month=2026-02&page=2')
    getBudget(7, '2026-02')
    expect(apiRequest).toHaveBeenCalledWith('budgets/7/?month=2026-02')
  })
  it('sends exact limits, explicit removal and the read version once', () => {
    const values = {
      month: '2026-02',
      scope: 'future' as const,
      version: 3,
      limit_iqd: '9999999999999999.99',
      limit_usd: null,
    }
    saveBudget(7, values)
    expect(apiRequest).toHaveBeenCalledExactlyOnceWith('budgets/7/', values)
  })
  it('opens ordinary category expenses for the entire fixed Gregorian month', () => {
    for (const [month, end] of [
      ['2024-02', '29'],
      ['2026-02', '28'],
      ['2026-12', '31'],
    ]) {
      const link = budgetActivityLink({ category: 7, month } as BudgetRow, 'USD')
      const query = new URLSearchParams(link.split('?')[1])
      expect(Object.fromEntries(query)).toEqual({
        category: '7',
        kind: 'expense',
        currency: 'USD',
        start: `${month}-01`,
        end: `${month}-${end}`,
      })
    }
  })
})
