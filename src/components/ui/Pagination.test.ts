import test from 'node:test';
import assert from 'node:assert/strict';
import { paginationPageCount } from './Pagination';

test('page count follows the backend default of 30 rows', () => {
  assert.equal(paginationPageCount(30), 1);
  assert.equal(paginationPageCount(31), 2);
  assert.equal(paginationPageCount(61), 3);
});
