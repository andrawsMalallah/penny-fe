import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_PRIMARY_TABS, isRouteActive } from './navigation';

test('debt detail remains on the Debts mobile tab', () => {
  assert.equal(isRouteActive('debt-detail', 'debts'), true);
  assert.equal(MOBILE_PRIMARY_TABS.length, 4);
});

test('secondary destinations stay available through the drawer', () => {
  for (const route of ['accounts', 'recurring', 'analytics', 'settings'] as const) {
    assert.equal(MOBILE_PRIMARY_TABS.includes(route), false);
  }
  assert.equal(isRouteActive('monthly', 'analytics'), true);
  assert.equal(MOBILE_PRIMARY_TABS.includes('overview'), true);
});
