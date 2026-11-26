import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useI18n } from './i18n/useI18n';
import {
  buildHashRoute,
  parseHashRoute,
  type ActivityFilters,
  type AppRouteName,
  type ParsedRoute,
} from './utils/router';
import { AppShell } from './components/layout/AppShell';
import { AuthFlow } from './features/auth/AuthFlow';
import { OverviewPage } from './features/overview/OverviewPage';
import { ActivityPage } from './features/activity/ActivityPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { DebtsPage } from './features/debts/DebtsPage';
import { DebtDetailPage } from './features/debts/DebtDetailPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { RecurringPage } from './features/recurring/RecurringPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TransactionModal } from './features/activity/TransactionModal';

function PennyAppContent() {
  const { loading, user, twoFactorPending, sessionCheckFailed, refreshSession } = useAuth();
  const { t } = useI18n();

  const [route, setRoute] = useState<ParsedRoute>(() =>
    parseHashRoute(typeof window !== 'undefined' ? window.location.hash : '')
  );
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Partial<ParsedRoute> & { name: AppRouteName }) => {
    const hash = buildHashRoute(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRoute(parseHashRoute(hash));
    }
  }, []);

  const handleUpdateActivityFilters = useCallback(
    (filters: ActivityFilters) => {
      navigate({ name: 'activity', activity: filters });
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400" role="status" aria-label={t.common.loading}>
        <div className="w-44 text-center space-y-4">
          <img src="/penny-mark.svg" alt="" className="w-12 h-12 rounded-xl mx-auto" />
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.appName}</p>
            <p className="mt-1 text-sm">{t.common.loading}</p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
            <span className="penny-loading-bar block h-full w-1/3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  if (sessionCheckFailed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100">
        <div role="alert" className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
          <img src="/penny-mark.svg" alt="" className="w-12 h-12 rounded-xl mx-auto" />
          <h1 className="mt-4 text-xl font-semibold">{t.common.sessionCheckFailedTitle}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t.common.sessionCheckFailedBody}
          </p>
          <button
            type="button"
            onClick={() => void refreshSession()}
            className="mt-5 min-h-[44px] px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!user || twoFactorPending) {
    return <AuthFlow />;
  }

  return (
    <>
      <AppShell
        currentRoute={route.name}
        onNavigate={(name) => navigate({ name })}
        onQuickAddTransaction={() => setQuickTxOpen(true)}
      >
        {route.name === 'overview' && (
          <OverviewPage
            onNavigate={(name) => navigate({ name })}
            onQuickAddTransaction={() => setQuickTxOpen(true)}
            refreshTrigger={refreshTick}
          />
        )}

        {route.name === 'activity' && (
          <ActivityPage
            filters={route.activity}
            onUpdateFilters={handleUpdateActivityFilters}
            onOpenDebt={(debtId) => navigate({ name: 'debt-detail', debtId })}
            refreshTrigger={refreshTick}
          />
        )}

        {route.name === 'accounts' && <AccountsPage />}

        {route.name === 'debts' && (
          <DebtsPage onOpenDebt={(debtId) => navigate({ name: 'debt-detail', debtId })} />
        )}

        {route.name === 'debt-detail' && route.debtId && (
          <DebtDetailPage
            debtId={route.debtId}
            onBack={() => navigate({ name: 'debts' })}
          />
        )}

        {route.name === 'budgets' && (
          <BudgetsPage
            month={route.month}
            onChangeMonth={(month) => navigate({ name: 'budgets', month })}
          />
        )}

        {route.name === 'recurring' && <RecurringPage />}

        {(route.name === 'analytics' || route.name === 'monthly') && (
          <AnalyticsPage
            initialTab={route.name === 'monthly' ? 'monthly' : 'period'}
            initialMonth={route.month}
            onSyncRoute={(tab, month) =>
              navigate({ name: tab === 'monthly' ? 'monthly' : 'analytics', month })
            }
          />
        )}

        {route.name === 'settings' && <SettingsPage />}
      </AppShell>

      <TransactionModal
        open={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSaved={() => {
          setRefreshTick((v) => v + 1);
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PennyAppContent />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
