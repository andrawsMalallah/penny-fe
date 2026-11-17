import { apiRequest } from './api'
import type { RecordPage } from './accounts'
import type { Currency, MoneyTransaction } from './transactions'

export type DebtDirection = 'owed_to_me' | 'i_owe'
export type DebtOrigin = 'existing' | 'movement'
export interface DebtEntryValues {
  account: number | null
  amount: string
  date: string
  note: string
}
export interface DebtValues extends DebtEntryValues {
  person: number | null
  person_name: string
  direction: DebtDirection
  origin: DebtOrigin
  currency: Currency | ''
}
export interface Debt extends DebtValues {
  id: number
  currency: Currency
  person: number
  version: number
  account_name: string
  account_archived: boolean
  opening_date: string | null
  repaid: string
  remaining: string
  repayment_count: number
}
export interface DebtFilters {
  person: string
  direction: DebtDirection | ''
  currency: Currency | ''
  status: 'open' | 'settled' | 'all'
}
export function getDebts(filters: DebtFilters, page = 1): Promise<RecordPage<Debt>> {
  const query = new URLSearchParams({ page: String(page) })
  for (const [field, value] of Object.entries(filters)) if (value) query.set(field, value)
  return apiRequest(`debts/?${query}`)
}
export function getRepayments(id: number, page = 1): Promise<RecordPage<MoneyTransaction>> {
  return apiRequest(`debts/${id}/repayments/?page=${page}`)
}
export function groupedDebts(records: Debt[]): [string, Debt[]][] {
  const people = new Map<string, Debt[]>()
  for (const debt of records) {
    const group = people.get(debt.person_name) ?? []
    group.push(debt)
    people.set(debt.person_name, group)
  }
  return [...people]
}
export function debtIdFromHash(hash: string): number | null {
  const match = /^#\/debts\/([1-9]\d*)$/.exec(hash)
  if (!match) return null
  const id = Number(match[1])
  return Number.isSafeInteger(id) ? id : null
}
