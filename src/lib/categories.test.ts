import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoryName, getCategoryPage } from './categories'
import { ApiError, apiRequest } from './api'

afterEach(() => vi.unstubAllGlobals())
describe('expense categories', () => {
  it('uses the selected language with a fallback for missing translations', () => {
    const category = { name_en: 'Food', name_ar: 'طعام' }
    expect(categoryName(category, 'en')).toBe('Food')
    expect(categoryName(category, 'ar')).toBe('طعام')
    expect(categoryName({ ...category, name_ar: '' }, 'ar')).toBe('Food')
    expect(categoryName({ ...category, name_en: '' }, 'en')).toBe('طعام')
  })
  it('reads a fresh bounded archive page', async () => {
    const result = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, name_en: 'Food', name_ar: '', archived: true }],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getCategoryPage(2, true)).toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/expense-categories/?page=2&archived=true',
      expect.objectContaining({ method: 'GET', cache: 'no-store', credentials: 'same-origin' }),
    )
  })
  it('retains only allowed category validation fields from API failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            name_en: ['Duplicate'],
            name_ar: ['Invalid'],
            detail: 'Raw exception',
            secret: ['No'],
          }),
          { status: 400 },
        ),
      ),
    )
    await expect(apiRequest('expense-categories/')).rejects.toEqual(
      new ApiError(400, { name_en: ['Duplicate'], name_ar: ['Invalid'] }),
    )
  })
})
