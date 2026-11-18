import { apiDownload, apiRequest } from './api'
import type { ActivityFilters } from './transactions'

function exportQuery(filters: ActivityFilters): URLSearchParams {
  const query = new URLSearchParams()
  for (const field of ['account', 'category', 'kind', 'currency', 'start', 'end'] as const) {
    if (filters[field]) query.set(field, filters[field])
  }
  return query
}

export function getExportCount(filters: ActivityFilters): Promise<{ count: number }> {
  return apiRequest(`transactions/export/count/?${exportQuery(filters)}`)
}

export function getActivityCsv(
  filters: ActivityFilters,
  language: 'en' | 'ar',
  count: number,
  signal: AbortSignal,
): Promise<Blob> {
  const query = exportQuery(filters)
  query.set('language', language)
  query.set('expected_count', String(count))
  return apiDownload(`transactions/export/?${query}`, signal)
}

export function saveActivityCsv(document: Blob, language: 'en' | 'ar'): void {
  const url = URL.createObjectURL(document)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `penny-activity-${language}.csv`
  window.document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Allow the browser to begin reading the file before releasing its memory.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
