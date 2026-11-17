import { apiRequest } from './api'

export interface AccountGroup {
  id: number
  name: string
  archived: boolean
}
export interface MoneyAccount extends AccountGroup {
  group: number | null
  group_name: string | null
  created_at: string
  balance_iqd: string
  balance_usd: string
  opening: { iqd: string; usd: string; recorded_at: string }
}
export interface AccountValues {
  name: string
  group: number | null
  opening_iqd?: string
  opening_usd?: string
}
export interface RecordPage<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
export type AccountResource = 'accounts' | 'account-groups'
export function getAccountPage<T>(resource: AccountResource, page = 1, archived = false) {
  return apiRequest<RecordPage<T>>(`${resource}/?page=${page}&archived=${archived}`)
}
// Group digit strings directly: Number would lose cents on larger valid amounts.
export function formatMoney(amount: string): string {
  const [integer = '0', fraction = '00'] = amount.split('.')
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}
