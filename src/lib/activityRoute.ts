import type { ActivityFilters, Currency, TransactionKind } from './transactions'
export function activityFiltersFromHash(hash: string): ActivityFilters {
  const filters: ActivityFilters = {
    account: '',
    category: '',
    kind: '',
    currency: '',
    start: '',
    end: '',
  }
  if (hash.split('?')[0] !== '#/activity') return filters
  const query = new URLSearchParams(hash.split('?')[1] ?? '')
  for (const key of ['account', 'category'] as const) {
    const value = query.get(key) ?? ''
    if (/^[1-9]\d{0,15}$/.test(value)) filters[key] = value
  }
  const currency = query.get('currency') ?? '',
    kind = query.get('kind') ?? ''
  if (['IQD', 'USD'].includes(currency)) filters.currency = currency as Currency
  if (['income', 'expense', 'transfer', 'exchange', 'debt_in', 'debt_out'].includes(kind))
    filters.kind = kind as TransactionKind
  for (const key of ['start', 'end'] as const) {
    const value = query.get(key) ?? ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) filters[key] = value
  }
  return filters
}
