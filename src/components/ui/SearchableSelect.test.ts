import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterChoices, loadAllChoices } from './SearchableSelect';

test('loads every choice page before local filtering', async () => {
  const requestedPages: number[] = [];
  const choices = await loadAllChoices(async (page) => {
    requestedPages.push(page);
    return {
      count: 12,
      next: page === 1 ? '/api/v1/accounts/?page=2' : null,
      previous: null,
      results: page === 1
        ? Array.from({ length: 10 }, (_, index) => ({ id: index + 1, name: `Account ${index + 1}` }))
        : [{ id: 11, name: 'Savings' }, { id: 12, name: 'Travel' }],
    };
  });
  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(filterChoices(choices, (choice) => choice.name, ' sav '), [{ id: 11, name: 'Savings' }]);
  assert.equal(filterChoices(choices, (choice) => choice.name, '').length, 12);
});

test('category search can match either language while showing the chosen label', () => {
  const categories = [{ id: 1, name_en: 'Food', name_ar: 'طعام' }];
  assert.deepEqual(
    filterChoices(categories, (category) => category.name_en, 'طعام',
      (category) => `${category.name_en} ${category.name_ar}`),
    categories,
  );
});
