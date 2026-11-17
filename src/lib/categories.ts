import { apiRequest } from './api'
import type { RecordPage } from './accounts'

export interface ExpenseCategory {
  id: number
  name_en: string
  name_ar: string
  archived: boolean
}
export type CategoryValues = Pick<ExpenseCategory, 'name_en' | 'name_ar'>

export function categoryName(category: CategoryValues, language: 'en' | 'ar'): string {
  return language === 'ar'
    ? category.name_ar || category.name_en
    : category.name_en || category.name_ar
}

export function getCategoryPage(page = 1, archived = false): Promise<RecordPage<ExpenseCategory>> {
  return apiRequest(`expense-categories/?page=${page}&archived=${archived}`)
}
