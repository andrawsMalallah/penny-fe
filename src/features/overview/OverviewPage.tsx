import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  accountsApi,
  analyticsApi,
  budgetsApi,
  transactionsApi,
} from '../../api/endpoints';
import type {
  Account,
  AnalyticsSummaryResponse,
  BudgetRow,
  Transaction,
} from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { currentMonthYM, formatDisplayDate, getDeviceTimezone } from '../../utils/date';
import { computePercentRatio, isPositiveDecimal } from '../../utils/money';
import type { AppRouteName } from '../../utils/router';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';

interface OverviewPageProps {
  onNavigate: (route: AppRouteName) => void;
  onQuickAddTransaction: () => void;
  refreshTrigger?: number;
}

export function OverviewPage({
  onNavigate,
  onQuickAddTransaction,
  refreshTrigger = 0,
}: OverviewPageProps) {
  const { t, language, dir, categoryLabel } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tz = getDeviceTimezone();
    const month = currentMonthYM(tz);
    try {
      const [analyticsRes, accountsRes, txRes, budgetsRes] = await Promise.all([
        analyticsApi.getSummary({ period: 'this_month', timezone: tz }),
        accountsApi.listAccounts({ archived: 'false', page: 1 }),
        transactionsApi.list({ page: 1 }),
        budgetsApi.list(month, 1).catch(() => ({ count: 0, next: null, previous: null, results: [] })),
      ]);
      setAnalytics(analyticsRes);
      setAccounts(accountsRes.results);
      setRecentTx(txRes.results.slice(0, 6));
      setBudgets(budgetsRes.results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview, refreshTrigger]);

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const budgetAlerts = budgets.filter((b) => {
    const iqdPct = b.IQD.limit ? computePercentRatio(b.IQD.spent, b.IQD.limit) : 0;
    const usdPct = b.USD.limit ? computePercentRatio(b.USD.spent, b.USD.limit) : 0;
    return b.IQD.over || b.USD.over || iqdPct >= 80 || usdPct >= 80;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.overview.title}
        subtitle={t.overview.subtitle}
        actionsClassName="hidden lg:flex"
        actions={
          <button
            type="button"
            onClick={onQuickAddTransaction}
            className="hidden lg:inline-flex min-h-[42px] px-4 py-2 items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.activity.newTransaction}</span>
          </button>
        }
      />

      <ErrorAlert error={error} onRetry={() => void loadOverview()} />

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <>
          {/* Primary Dual-Currency Position & Period Activity */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Current Balances & Debts */}
              <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {t.overview.totalHoldings}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.overview.holdingsHint}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="pb-4 sm:pb-0 sm:pe-5 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      IQD
                    </span>
                    <div className="text-2xl font-bold">
                      <CurrencyAmount amount={analytics.position.IQD.holdings} currency="IQD" />
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.overview.owedToMe}</span>
                        <CurrencyAmount amount={analytics.position.IQD.owed_to_me} currency="IQD" tone="positive" />
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.overview.iOwe}</span>
                        <CurrencyAmount amount={analytics.position.IQD.i_owe} currency="IQD" tone="negative" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-0 sm:ps-5 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      USD
                    </span>
                    <div className="text-2xl font-bold">
                      <CurrencyAmount amount={analytics.position.USD.holdings} currency="USD" />
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.overview.owedToMe}</span>
                        <CurrencyAmount amount={analytics.position.USD.owed_to_me} currency="USD" tone="positive" />
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.overview.iOwe}</span>
                        <CurrencyAmount amount={analytics.position.USD.i_owe} currency="USD" tone="negative" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* This Month's Activity */}
              <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {t.overview.thisMonthActivity}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.overview.activityHint}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {(['IQD', 'USD'] as const).map((curr, idx) => {
                    const flow = analytics.flow[curr];
                    return (
                      <div
                        key={curr}
                        className={`${
                          idx === 0 ? 'pb-4 sm:pb-0 sm:pe-5' : 'pt-4 sm:pt-0 sm:ps-5'
                        } space-y-2.5`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {curr}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                            {formatDisplayDate(analytics.start, language)}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              {t.overview.income}
                            </span>
                            <CurrencyAmount amount={flow.income} currency={curr} tone="positive" className="font-medium" />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              {t.overview.expenses}
                            </span>
                            <CurrencyAmount amount={flow.expense} currency={curr} tone="negative" className="font-medium" />
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              {t.overview.netDifference}
                            </span>
                            <CurrencyAmount
                              amount={flow.difference}
                              currency={curr}
                              showSign
                              tone={flow.difference.startsWith('-') ? 'negative' : 'positive'}
                              className="font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* Accounts Snapshot & Budget Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{t.overview.accountsSnapshot}</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('accounts')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <span>{t.overview.manageAccounts}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {accounts.length === 0 ? (
                <EmptyState
                  title={t.overview.noAccountsYet}
                  description={t.overview.initializeCategoriesHint}
                  action={
                    <button
                      type="button"
                      onClick={() => onNavigate('accounts')}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
                    >
                      {t.overview.createFirstAccount}
                    </button>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {accounts.slice(0, 5).map((acc) => {
                    const hasIqdTarget = isPositiveDecimal(acc.target_iqd);
                    const hasUsdTarget = isPositiveDecimal(acc.target_usd);
                    const iqdPct = hasIqdTarget
                      ? Math.min(100, computePercentRatio(acc.balance_iqd, acc.target_iqd))
                      : 0;
                    const usdPct = hasUsdTarget
                      ? Math.min(100, computePercentRatio(acc.balance_usd, acc.target_usd))
                      : 0;
                    return (
                      <div key={acc.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {acc.name}
                            </p>
                            {acc.group_name && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {acc.group_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 text-sm">
                            <CurrencyAmount amount={acc.balance_iqd} currency="IQD" className="font-semibold" />
                            <CurrencyAmount amount={acc.balance_usd} currency="USD" className="text-xs text-slate-600 dark:text-slate-300" />
                          </div>
                        </div>

                        {(hasIqdTarget || hasUsdTarget) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {hasIqdTarget && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>{t.overview.targetProgress} (IQD)</span>
                                  <span className="tabular-nums">{iqdPct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 dark:bg-emerald-500"
                                    style={{ width: `${iqdPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {hasUsdTarget && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>{t.overview.targetProgress} (USD)</span>
                                  <span className="tabular-nums">{usdPct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 dark:bg-emerald-500"
                                    style={{ width: `${usdPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{t.overview.budgetAlerts}</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('budgets')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <span>{t.overview.viewBudgets}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {budgetAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                  {t.common.noData}
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {budgetAlerts.slice(0, 5).map((b) => (
                    <div key={b.category_id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{categoryLabel(b)}</span>
                        <span
                          className={`text-xs font-medium ${
                            b.IQD.over || b.USD.over
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {b.IQD.over || b.USD.over ? t.overview.overLimit : t.overview.nearLimit}
                        </span>
                      </div>
                      {b.IQD.limit && (
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>IQD</span>
                          <span>
                            <CurrencyAmount amount={b.IQD.spent} currency="IQD" /> /{' '}
                            <CurrencyAmount amount={b.IQD.limit} currency="IQD" />
                          </span>
                        </div>
                      )}
                      {b.USD.limit && (
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>USD</span>
                          <span>
                            <CurrencyAmount amount={b.USD.spent} currency="USD" /> /{' '}
                            <CurrencyAmount amount={b.USD.limit} currency="USD" />
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Recent Activity */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{t.overview.recentActivity}</h2>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                <span>{t.overview.viewAllActivity}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTx.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">{t.common.noData}</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t.activity.kinds[tx.kind]}
                        {tx.category
                          ? ` · ${categoryLabel({
                              name_en: tx.category_name_en,
                              name_ar: tx.category_name_ar,
                              name: tx.category_name,
                            })}`
                          : ''}
                        {tx.debt_person_name ? ` · ${tx.debt_person_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tx.account_name}
                        {tx.destination_name ? ` → ${tx.destination_name}` : ''} ·{' '}
                        {formatDisplayDate(tx.date, language)}
                        {tx.note ? ` · ${tx.note}` : ''}
                      </p>
                    </div>
                    <CurrencyAmount
                      amount={tx.amount}
                      currency={tx.currency}
                      tone={
                        tx.kind === 'income' || tx.kind === 'debt_in'
                          ? 'positive'
                          : tx.kind === 'expense' || tx.kind === 'debt_out'
                            ? 'negative'
                            : 'info'
                      }
                      showSign={tx.kind === 'income' || tx.kind === 'debt_in'}
                      className="text-sm font-semibold shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
