import type { AppRouteName } from '../../utils/router';

export const MOBILE_PRIMARY_TABS: AppRouteName[] = ['overview', 'activity', 'debts', 'budgets'];

export function isRouteActive(currentRoute: AppRouteName, key: AppRouteName): boolean {
  if (key === 'debts' && currentRoute === 'debt-detail') return true;
  if (key === 'analytics' && currentRoute === 'monthly') return true;
  return currentRoute === key;
}
