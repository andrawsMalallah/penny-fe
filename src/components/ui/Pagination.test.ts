import test from 'node:test';
import assert from 'node:assert/strict';
import { paginationPageCount } from './Pagination';

test('page count follows the backend default of 10 rows', () => {
  assert.equal(paginationPageCount(10), 1);
  assert.equal(paginationPageCount(11), 2);
  assert.equal(paginationPageCount(21), 3);
});
