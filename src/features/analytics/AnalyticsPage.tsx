import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { analyticsApi } from '../../api/endpoints';
import type {
  AccountBreakdownRow,
  AnalyticsPeriod,
  AnalyticsSummaryResponse,
  AnalyticsTrendPoint,
  CategoryBreakdownRow,
  GroupBreakdownRow,
  MonthlyReviewResponse,
  PaginatedResponse,
  PersonDebtBreakdownRow,
} from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import {
  currentMonthYM,
  formatDisplayDate,
  formatMonthLabel,
  getDeviceTimezone,
  shiftMonth,
  todayYMD,
} from '../../utils/date';
import {
  computePercentRatio,
  formatMoney,
  parseDecimalToBigInt,
  type CurrencyCode,
} from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';

interface AnalyticsPageProps {
  initialTab?: 'period' | 'monthly';
  initialMonth?: string;
  onSyncRoute?: (tab: 'period' | 'monthly', month?: string) => void;
}

function SixMonthTrendChart({
  trend,
  currency,
}: {
  trend: AnalyticsTrendPoint[];
  currency: CurrencyCode;
}) {
  const { t, language } = useI18n();
  if (!trend || trend.length === 0) return null;

  // Compute max scale using BigInt to avoid precision loss on large IQD totals
  let maxVal = 1n;
  for (const pt of trend) {
    const inc = parseDecimalToBigInt(pt[currency].income, 2) ?? 0n;
    const exp = parseDecimalToBigInt(pt[currency].expense, 2) ?? 0n;
    if (inc > maxVal) maxVal = inc;
    if (exp > maxVal) maxVal = exp;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">{currency}</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
            {t.overview.income}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-500 dark:bg-red-400" />
            {t.overview.expenses}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-36 pt-3 border-b border-slate-200 dark:border-slate-800">
        {trend.map((pt) => {
          const inc = parseDecimalToBigInt(pt[currency].income, 2) ?? 0n;
          const exp = parseDecimalToBigInt(pt[currency].expense, 2) ?? 0n;
          const incPct = inc > 0n ? Math.max(4, Number((inc * 100n) / maxVal)) : 0;
          const expPct = exp > 0n ? Math.max(4, Number((exp * 100n) / maxVal)) : 0;
          const label = pt.month.slice(5);
          return (
            <div key={pt.month} className="h-full flex flex-col items-center justify-end gap-1.5">
              <div className="w-full flex-1 flex items-end justify-center gap-1">
                <div
                  title={`${t.overview.income}: ${formatMoney(pt[currency].income, currency, language)}`}
                  className="w-3 sm:w-4 rounded-t bg-emerald-600 dark:bg-emerald-500 transition-all"
                  style={{ height: `${incPct}%` }}
                />
                <div
                  title={`${t.overview.expenses}: ${formatMoney(pt[currency].expense, currency, language)}`}
                  className="w-3 sm:w-4 rounded-t bg-red-500 dark:bg-red-400 transition-all"
                  style={{ height: `${expPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 pb-1">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsPage({
  initialTab = 'period',
  initialMonth,
  onSyncRoute,
}: AnalyticsPageProps) {
  const { t, language, dir, format, categoryLabel } = useI18n();
  const [tab, setTab] = useState<'period' | 'monthly'>(initialTab);

  // Period Analytics state
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [customStart, setCustomStart] = useState(() => `${currentMonthYM()}-01`);
  const [customEnd, setCustomEnd] = useState(() => todayYMD());
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [periodError, setPeriodError] = useState<unknown>(null);

  // Paginated Breakdowns
  const [accPage, setAccPage] = useState(1);
  const [accRows, setAccRows] = useState<PaginatedResponse<AccountBreakdownRow> | null>(null);
  const [grpPage, setGrpPage] = useState(1);
  const [grpRows, setGrpRows] = useState<PaginatedResponse<GroupBreakdownRow> | null>(null);
  const [catPage, setCatPage] = useState(1);
  const [catRows, setCatRows] = useState<PaginatedResponse<CategoryBreakdownRow> | null>(null);
  const [pplPage, setPplPage] = useState(1);
  const [pplRows, setPplRows] = useState<PaginatedResponse<PersonDebtBreakdownRow> | null>(null);

  // Monthly Review state
  const [reviewMonth, setReviewMonth] = useState(() => initialMonth || currentMonthYM());
  const [reviewPage, setReviewPage] = useState(1);
  const [monthly, setMonthly] = useState<MonthlyReviewResponse | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyError, setMonthlyError] = useState<unknown>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialMonth) setReviewMonth(initialMonth);
  }, [initialMonth]);

  const loadPeriodAnalytics = useCallback(async () => {
    setLoadingPeriod(true);
    setPeriodError(null);
    try {
      const res = await analyticsApi.getSummary({
        period,
        timezone: getDeviceTimezone(),
        start: period === 'custom' ? customStart : undefined,
        end: period === 'custom' ? customEnd : undefined,
      });
      setSummary(res);
      setAccRows(res.accounts);
      setGrpRows(res.groups);
      setCatRows(res.categories);
      setPplRows(res.people);
      setAccPage(1);
      setGrpPage(1);
      setCatPage(1);
      setPplPage(1);
    } catch (err) {
      setPeriodError(err);
    } finally {
      setLoadingPeriod(false);
    }
  }, [period, customStart, customEnd]);

  const loadMonthly = useCallback(async () => {
    setLoadingMonthly(true);
    setMonthlyError(null);
    try {
      const res = await analyticsApi.getMonthlyReview({
        month: reviewMonth,
        timezone: getDeviceTimezone(),
        page: reviewPage,
      });
      setMonthly(res);
    } catch (err) {
      setMonthlyError(err);
    } finally {
      setLoadingMonthly(false);
    }
  }, [reviewMonth, reviewPage]);

  useEffect(() => {
    if (tab === 'period') {
      void loadPeriodAnalytics();
    } else {
      void loadMonthly();
    }
  }, [tab, loadPeriodAnalytics, loadMonthly]);

  const fetchAccountPage = async (nextPage: number) => {
    setAccPage(nextPage);
    const res = await analyticsApi.getAccounts({
      period,
      timezone: getDeviceTimezone(),
      start: period === 'custom' ? customStart : undefined,
      end: period === 'custom' ? customEnd : undefined,
      page: nextPage,
    });
    setAccRows(res);
  };

  const fetchGroupPage = async (nextPage: number) => {
    setGrpPage(nextPage);
    const res = await analyticsApi.getGroups({
      period,
      timezone: getDeviceTimezone(),
      start: period === 'custom' ? customStart : undefined,
      end: period === 'custom' ? customEnd : undefined,
      page: nextPage,
    });
    setGrpRows(res);
  };

  const fetchCategoryPage = async (nextPage: number) => {
    setCatPage(nextPage);
    const res = await analyticsApi.getCategories({
      period,
      timezone: getDeviceTimezone(),
      start: period === 'custom' ? customStart : undefined,
      end: period === 'custom' ? customEnd : undefined,
      page: nextPage,
    });
    setCatRows(res);
  };

  const fetchPeoplePage = async (nextPage: number) => {
    setPplPage(nextPage);
    const res = await analyticsApi.getPeople({
      period,
      timezone: getDeviceTimezone(),
      start: period === 'custom' ? customStart : undefined,
      end: period === 'custom' ? customEnd : undefined,
      page: nextPage,
    });
    setPplRows(res);
  };

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tab === 'period' ? t.analytics.title : t.analytics.monthlyTitle}
        subtitle={
          tab === 'period'
            ? t.analytics.subtitle
            : monthly
              ? format(t.analytics.monthlySubtitle, {
                  month: formatMonthLabel(monthly.month, language),
                  prev: formatMonthLabel(monthly.previous_month, language),
                })
              : undefined
        }
      />

      {/* Mode tabs */}
      <div
        role="tablist"
        className="penny-page-tabs bg-slate-200/70 dark:bg-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'period'}
          onClick={() => {
            setTab('period');
            onSyncRoute?.('period');
          }}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            tab === 'period'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.analytics.tabPeriod}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'monthly'}
          onClick={() => {
            setTab('monthly');
            onSyncRoute?.('monthly', reviewMonth);
          }}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            tab === 'monthly'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.analytics.tabMonthly}
        </button>
      </div>

      {tab === 'period' ? (
        <div className="space-y-6">
          {/* Period Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="w-full min-w-0 lg:w-auto lg:min-w-60">
              <label htmlFor="an-period" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.analytics.period}
              </label>
              <select
                id="an-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
                className="w-full min-w-0 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {(['this_month', 'previous_month', 'this_year', 'custom'] as AnalyticsPeriod[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {t.analytics.periods[p]}
                    </option>
                  )
                )}
              </select>
            </div>

            {period === 'custom' && (
              <>
                <div className="w-full min-w-0 lg:w-auto">
                  <label htmlFor="an-start" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.activity.startDate}
                  </label>
                  <input
                    id="an-start"
                    type="date"
                    dir="ltr"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full min-w-0 lg:w-auto min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                  />
                </div>
                <div className="w-full min-w-0 lg:w-auto">
                  <label htmlFor="an-end" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.activity.endDate}
                  </label>
                  <input
                    id="an-end"
                    type="date"
                    dir="ltr"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full min-w-0 lg:w-auto min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                  />
                </div>
              </>
            )}

            {summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 ms-auto">
                {formatDisplayDate(summary.start, language)} –{' '}
                {formatDisplayDate(summary.end, language)} ·{' '}
                {format(t.analytics.comparedTo, {
                  start: formatDisplayDate(summary.previous_start, language),
                  end: formatDisplayDate(summary.previous_end, language),
                })}
              </p>
            )}
          </div>

          <ErrorAlert error={periodError} onRetry={() => void loadPeriodAnalytics()} />

          {loadingPeriod ? (
            <LoadingRows rows={5} />
          ) : summary ? (
            <>
              {/* Position & Period Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                  <h2 className="text-base font-semibold">{t.analytics.positionTitle}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {(['IQD', 'USD'] as CurrencyCode[]).map((curr, idx) => {
                      const pos = summary.position[curr];
                      return (
                        <div
                          key={curr}
                          className={`${
                            idx === 0 ? 'pb-4 sm:pb-0 sm:pe-5' : 'pt-4 sm:pt-0 sm:ps-5'
                          } space-y-2 text-sm`}
                        >
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {curr}
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{t.analytics.holdings}</span>
                            <CurrencyAmount amount={pos.holdings} currency={curr} className="font-semibold" />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{t.debts.owedToMe}</span>
                            <CurrencyAmount amount={pos.owed_to_me} currency={curr} tone="positive" />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{t.debts.iOwe}</span>
                            <CurrencyAmount amount={pos.i_owe} currency={curr} tone="negative" />
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between gap-2 font-semibold">
                            <span>{t.analytics.netPosition}</span>
                            <CurrencyAmount
                              amount={pos.net_position}
                              currency={curr}
                              tone={pos.net_position.startsWith('-') ? 'negative' : 'positive'}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                  <h2 className="text-base font-semibold">{t.analytics.flowTitle}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {(['IQD', 'USD'] as CurrencyCode[]).map((curr, idx) => {
                      const fl = summary.flow[curr];
                      return (
                        <div
                          key={curr}
                          className={`${
                            idx === 0 ? 'pb-4 sm:pb-0 sm:pe-5' : 'pt-4 sm:pt-0 sm:ps-5'
                          } space-y-2 text-sm`}
                        >
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {curr}
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{t.overview.income}</span>
                            <CurrencyAmount amount={fl.income} currency={curr} tone="positive" className="font-semibold" />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{t.overview.expenses}</span>
                            <CurrencyAmount amount={fl.expense} currency={curr} tone="negative" className="font-semibold" />
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between gap-2 font-semibold">
                            <span>{t.overview.netDifference}</span>
                            <CurrencyAmount
                              amount={fl.difference}
                              currency={curr}
                              showSign
                              tone={fl.difference.startsWith('-') ? 'negative' : 'positive'}
                            />
                          </div>
                          {fl.previous_difference !== undefined && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>{t.common.previous}</span>
                              <CurrencyAmount amount={fl.previous_difference} currency={curr} showSign />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* 6-Month Trend */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
                <h2 className="text-base font-semibold">{t.analytics.sixMonthTrend}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SixMonthTrendChart trend={summary.trend} currency="IQD" />
                  <SixMonthTrendChart trend={summary.trend} currency="USD" />
                </div>
              </section>

              {/* Paginated Breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Accounts */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold">{t.analytics.breakdownAccounts}</h2>
                  {!accRows || accRows.results.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.common.noData}</p>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {accRows.results.map((r, index) => (
                          <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-xs tabular-nums text-slate-500">{(accPage - 1) * 10 + index + 1}.</span>
                              <p className="font-medium">{r.name}</p>
                              <p className="text-xs text-slate-500">{r.group_name || t.analytics.ungrouped}</p>
                            </div>
                            <div className="text-end">
                              <div><CurrencyAmount amount={r.balance_iqd} currency="IQD" /></div>
                              <div className="text-xs text-slate-500"><CurrencyAmount amount={r.balance_usd} currency="USD" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={accPage}
                        count={accRows.count}
                        hasNext={Boolean(accRows.next)}
                        hasPrevious={Boolean(accRows.previous)}
                        onPageChange={(p) => void fetchAccountPage(p)}
                      />
                    </>
                  )}
                </section>

                {/* Groups */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold">{t.analytics.breakdownGroups}</h2>
                  {!grpRows || grpRows.results.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.common.noData}</p>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {grpRows.results.map((r, idx) => (
                          <div key={r.id ?? `ungrouped-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                            <span className="font-medium"><span className="me-2 text-xs tabular-nums text-slate-500">{(grpPage - 1) * 10 + idx + 1}.</span>{r.name || t.analytics.ungrouped}</span>
                            <div className="text-end">
                              <div><CurrencyAmount amount={r.balance_iqd} currency="IQD" /></div>
                              <div className="text-xs text-slate-500"><CurrencyAmount amount={r.balance_usd} currency="USD" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={grpPage}
                        count={grpRows.count}
                        hasNext={Boolean(grpRows.next)}
                        hasPrevious={Boolean(grpRows.previous)}
                        onPageChange={(p) => void fetchGroupPage(p)}
                      />
                    </>
                  )}
                </section>

                {/* Categories */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold">{t.analytics.breakdownCategories}</h2>
                  {!catRows || catRows.results.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.common.noData}</p>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {catRows.results.map((r, index) => (
                          <div key={r.category_id} className="py-2.5 flex items-center justify-between gap-3">
                            <span className="font-medium"><span className="me-2 text-xs tabular-nums text-slate-500">{(catPage - 1) * 10 + index + 1}.</span>{categoryLabel(r)}</span>
                            <div className="text-end">
                              <div><CurrencyAmount amount={r.spent_iqd} currency="IQD" tone="negative" /></div>
                              <div className="text-xs"><CurrencyAmount amount={r.spent_usd} currency="USD" tone="negative" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={catPage}
                        count={catRows.count}
                        hasNext={Boolean(catRows.next)}
                        hasPrevious={Boolean(catRows.previous)}
                        onPageChange={(p) => void fetchCategoryPage(p)}
                      />
                    </>
                  )}
                </section>

                {/* Debt People */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold">{t.analytics.breakdownPeople}</h2>
                  {!pplRows || pplRows.results.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.common.noData}</p>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {pplRows.results.map((r, index) => (
                          <div key={r.person_id} className="py-2.5 space-y-1">
                            <p className="font-medium"><span className="me-2 text-xs tabular-nums text-slate-500">{(pplPage - 1) * 10 + index + 1}.</span>{r.person_name}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <div>
                                {t.debts.owedToMe}: <CurrencyAmount amount={r.owed_to_me_iqd} currency="IQD" tone="positive" /> ·{' '}
                                <CurrencyAmount amount={r.owed_to_me_usd} currency="USD" tone="positive" />
                              </div>
                              <div className="text-end">
                                {t.debts.iOwe}: <CurrencyAmount amount={r.i_owe_iqd} currency="IQD" tone="negative" /> ·{' '}
                                <CurrencyAmount amount={r.i_owe_usd} currency="USD" tone="negative" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={pplPage}
                        count={pplRows.count}
                        hasNext={Boolean(pplRows.next)}
                        hasPrevious={Boolean(pplRows.previous)}
                        onPageChange={(p) => void fetchPeoplePage(p)}
                      />
                    </>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        /* Monthly Review Tab */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                aria-label={t.budgets.previousMonth}
                onClick={() => {
                  const next = shiftMonth(reviewMonth, -1);
                  setReviewMonth(next);
                  setReviewPage(1);
                  onSyncRoute?.('monthly', next);
                }}
                className="min-h-[40px] min-w-[40px] shrink-0 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <PrevIcon className="w-4 h-4" />
              </button>
              <input
                type="month"
                aria-label={t.budgets.month}
                dir="ltr"
                value={reviewMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setReviewMonth(e.target.value);
                    setReviewPage(1);
                    onSyncRoute?.('monthly', e.target.value);
                  }
                }}
                className="min-h-[40px] min-w-0 flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
              <button
                type="button"
                aria-label={t.budgets.nextMonth}
                onClick={() => {
                  const next = shiftMonth(reviewMonth, 1);
                  setReviewMonth(next);
                  setReviewPage(1);
                  onSyncRoute?.('monthly', next);
                }}
                className="min-h-[40px] min-w-[40px] shrink-0 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <NextIcon className="w-4 h-4" />
              </button>
            </div>

            {monthly?.is_current_month && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t.analytics.elapsedComparisonNote}
              </p>
            )}
          </div>

          <ErrorAlert error={monthlyError} onRetry={() => void loadMonthly()} />

          {loadingMonthly ? (
            <LoadingRows rows={4} />
          ) : monthly ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['IQD', 'USD'] as CurrencyCode[]).map((curr) => {
                  const fl = monthly.flow[curr];
                  return (
                    <div
                      key={curr}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">{curr}</span>
                        <span className="text-xs text-slate-500 font-mono-num">
                          {formatDisplayDate(monthly.start, language)} –{' '}
                          {formatDisplayDate(monthly.end, language)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t.overview.income}</span>
                        <CurrencyAmount amount={fl.income} currency={curr} tone="positive" className="font-semibold" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t.overview.expenses}</span>
                        <CurrencyAmount amount={fl.expense} currency={curr} tone="negative" className="font-semibold" />
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-semibold">
                        <span>{t.overview.netDifference}</span>
                        <CurrencyAmount
                          amount={fl.difference}
                          currency={curr}
                          showSign
                          tone={fl.difference.startsWith('-') ? 'negative' : 'positive'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top Spending Categories */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-semibold">{t.analytics.topCategories}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['IQD', 'USD'] as CurrencyCode[]).map((curr) => (
                    <div key={curr} className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500">{curr}</p>
                      {monthly.top_categories[curr].length === 0 ? (
                        <p className="text-sm text-slate-500">{t.common.noData}</p>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                          {monthly.top_categories[curr].map((c, index) => (
                            <div key={c.category_id} className="py-2 flex justify-between gap-2">
                              <span><span className="me-2 text-xs tabular-nums text-slate-500">{index + 1}.</span>{categoryLabel(c)}</span>
                              <CurrencyAmount amount={c.spent} currency={curr} tone="negative" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Monthly Budget Progress */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-semibold">{t.analytics.budgetProgress}</h2>
                {monthly.budgets.results.length === 0 ? (
                  <EmptyState title={t.common.noData} />
                ) : (
                  <>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {monthly.budgets.results.map((b, index) => (
                        <div key={b.category_id} className="py-3 space-y-2 text-sm">
                          <p className="font-medium"><span className="me-2 text-xs tabular-nums text-slate-500">{(reviewPage - 1) * 10 + index + 1}.</span>{categoryLabel(b)}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            {(['IQD', 'USD'] as CurrencyCode[]).map((curr) => {
                              const row = b[curr];
                              const pct = row.limit
                                ? Math.min(100, computePercentRatio(row.spent, row.limit))
                                : 0;
                              return (
                                <div key={curr} className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>{curr}</span>
                                    <span>
                                      <CurrencyAmount amount={row.spent} currency={curr} />
                                      {row.limit ? (
                                        <>
                                          {' / '}
                                          <CurrencyAmount amount={row.limit} currency={curr} />
                                        </>
                                      ) : null}
                                    </span>
                                  </div>
                                  {row.limit && (
                                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          row.over ? 'bg-red-600' : 'bg-emerald-600'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      page={reviewPage}
                      count={monthly.budgets.count}
                      hasNext={Boolean(monthly.budgets.next)}
                      hasPrevious={Boolean(monthly.budgets.previous)}
                      onPageChange={setReviewPage}
                    />
                  </>
                )}
              </section>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
