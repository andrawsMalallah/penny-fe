import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { accountsApi, transactionsApi } from '../../api/endpoints';
import type {
  PaginatedResponse,
  Transaction,
} from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { formatDisplayDate } from '../../utils/date';
import { formatMoney, type CurrencyCode } from '../../utils/money';
import type { ActivityFilters } from '../../utils/router';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TransactionModal } from './TransactionModal';
import { ExportCsvModal } from './ExportCsvModal';

interface ActivityPageProps {
  filters: ActivityFilters;
  onUpdateFilters: (next: ActivityFilters) => void;
  onOpenDebt: (debtId: number) => void;
  refreshTrigger?: number;
}

export function ActivityPage({
  filters,
  onUpdateFilters,
  onOpenDebt,
  refreshTrigger = 0,
}: ActivityPageProps) {
  const { t, language, format, categoryLabel } = useI18n();
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionsApi.list({
        account: filters.account || undefined,
        category: filters.category || undefined,
        kind: filters.kind || undefined,
        currency: filters.currency || undefined,
        start: filters.start || undefined,
        end: filters.end || undefined,
        page: filters.page,
      });
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters.account, filters.category, filters.kind, filters.currency, filters.start, filters.end, filters.page]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  const setFilterField = <K extends keyof ActivityFilters>(
    key: K,
    value: ActivityFilters[K]
  ) => {
    onUpdateFilters({
      ...filters,
      [key]: value,
      page: key === 'page' ? (value as number) : 1,
    });
  };

  const resetAllFilters = () => {
    onUpdateFilters({
      account: '',
      category: '',
      kind: '',
      currency: '',
      start: '',
      end: '',
      page: 1,
    });
  };

  const hasActiveFilters = Boolean(
    filters.account ||
      filters.category ||
      filters.kind ||
      filters.currency ||
      filters.start ||
      filters.end
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await transactionsApi.delete(deleteTarget.id, deleteTarget.version);
      setDeleteTarget(null);
      await loadTransactions();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const getToneForTx = (tx: Transaction): 'positive' | 'negative' | 'info' | 'neutral' => {
    if (tx.kind === 'income' || tx.kind === 'debt_in') return 'positive';
    if (tx.kind === 'expense' || tx.kind === 'debt_out') return 'negative';
    return 'info';
  };

  const isDebtTx = (tx: Transaction) => tx.kind === 'debt_in' || tx.kind === 'debt_out';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.activity.title}
        subtitle={t.activity.subtitle}
        actions={
          <>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{t.activity.exportCsv}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setModalOpen(true);
              }}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.activity.newTransaction}</span>
            </button>
          </>
        }
      />

      {/* Filter Bar */}
      <section
        aria-label={t.common.search}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label htmlFor="f-account" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.filterAccount}
            </label>
            <SearchableSelect
              id="f-account"
              label={t.activity.filterAccount}
              value={filters.account}
              emptyLabel={t.common.all}
              onChange={(value) => setFilterField('account', value)}
              loadPage={(page) => accountsApi.listAccounts({ archived: 'all', page })}
              getById={accountsApi.getAccount}
              getLabel={(account) => account.name}
            />
          </div>

          <div>
            <label htmlFor="f-kind" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.filterKind}
            </label>
            <select
              id="f-kind"
              value={filters.kind}
              onChange={(e) => setFilterField('kind', e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">{t.common.all}</option>
              {(
                ['income', 'expense', 'transfer', 'exchange', 'debt_in', 'debt_out'] as const
              ).map((k) => (
                <option key={k} value={k}>
                  {t.activity.kinds[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-category" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.filterCategory}
            </label>
            <SearchableSelect
              id="f-category"
              label={t.activity.filterCategory}
              value={filters.category}
              emptyLabel={t.common.all}
              onChange={(value) => setFilterField('category', value)}
              loadPage={(page) => accountsApi.listCategories({ archived: 'all', page })}
              getById={accountsApi.getCategory}
              getLabel={categoryLabel} getSearchText={(category) => `${category.name_en} ${category.name_ar}`}
            />
          </div>

          <div>
            <label htmlFor="f-currency" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.filterCurrency}
            </label>
            <select
              id="f-currency"
              value={filters.currency}
              onChange={(e) => setFilterField('currency', e.target.value as '' | CurrencyCode)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">{t.common.all}</option>
              <option value="IQD">IQD</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-start" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.startDate}
            </label>
            <input
              id="f-start"
              type="date"
              dir="ltr"
              value={filters.start}
              onChange={(e) => setFilterField('start', e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
            />
          </div>

          <div>
            <label htmlFor="f-end" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.activity.endDate}
            </label>
            <input
              id="f-end"
              type="date"
              dir="ltr"
              value={filters.end}
              onChange={(e) => setFilterField('end', e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.common.resetFilters}</span>
            </button>
          </div>
        )}
      </section>

      <ErrorAlert error={error} onRetry={() => void loadTransactions()} />

      {loading ? (
        <LoadingRows rows={5} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t.activity.noMatchingRows : t.common.noData}
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.common.resetFilters}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="penny-content-enter bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Desktop Ledger Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/60">
                  <th className="py-3 px-4 font-medium text-start">{t.common.date}</th>
                  <th scope="col" className="py-3 px-4 font-medium text-start">#</th>
                  <th className="py-3 px-4 font-medium text-start">{t.activity.kind}</th>
                  <th className="py-3 px-4 font-medium text-start">{t.common.account}</th>
                  <th className="py-3 px-4 font-medium text-start">{t.common.category}</th>
                  <th className="py-3 px-4 font-medium text-start">{t.common.note}</th>
                  <th className="py-3 px-4 font-medium text-end">{t.common.amount}</th>
                  <th className="py-3 px-4 font-medium text-end">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.results.map((tx, index) => {
                  const catText = tx.category
                    ? categoryLabel({
                        name_en: tx.category_name_en,
                        name_ar: tx.category_name_ar,
                        name: tx.category_name,
                      })
                    : '—';
                  const receivedCurrency: CurrencyCode = tx.currency === 'IQD' ? 'USD' : 'IQD';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 tabular-nums text-xs text-slate-500">{(filters.page - 1) * 10 + index + 1}.</td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono-num text-xs text-slate-600 dark:text-slate-400">
                        {formatDisplayDate(tx.date, language)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {t.activity.kinds[tx.kind]}
                        </span>
                        {tx.debt_role && (
                          <span className="ms-1.5 text-xs text-slate-500 dark:text-slate-400">
                            · {tx.debt_role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-slate-100">
                          {tx.account_name}
                          {tx.destination_name ? ` → ${tx.destination_name}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.debt_person_name ? tx.debt_person_name : catText}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {tx.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <CurrencyAmount
                          amount={tx.amount}
                          currency={tx.currency}
                          tone={getToneForTx(tx)}
                          showSign={tx.kind === 'income' || tx.kind === 'debt_in'}
                          className="font-semibold"
                        />
                        {tx.kind === 'exchange' && tx.received_amount && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            →{' '}
                            <CurrencyAmount
                              amount={tx.received_amount}
                              currency={receivedCurrency}
                              tone="positive"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        {isDebtTx(tx) ? (
                          tx.debt ? (
                            <button
                              type="button"
                              onClick={() => onOpenDebt(tx.debt!)}
                              className="min-h-[34px] px-2.5 py-1 inline-flex items-center gap-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            >
                              <span>{t.activity.openDebt}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`${t.common.edit} ${t.activity.kinds[tx.kind]} ${tx.date}`}
                              onClick={() => {
                                setEditingTx(tx);
                                setModalOpen(true);
                              }}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`${t.common.delete} ${t.activity.kinds[tx.kind]} ${tx.date}`}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(tx);
                              }}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List Rows */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {data.results.map((tx, index) => {
              const catText = tx.category
                ? categoryLabel({
                    name_en: tx.category_name_en,
                    name_ar: tx.category_name_ar,
                    name: tx.category_name,
                  })
                : null;
              const receivedCurrency: CurrencyCode = tx.currency === 'IQD' ? 'USD' : 'IQD';
              return (
                <div key={tx.id} className="p-4 space-y-2">
                  <span className="text-xs tabular-nums text-slate-500">{(filters.page - 1) * 10 + index + 1}.</span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {t.activity.kinds[tx.kind]}
                        {catText ? ` · ${catText}` : ''}
                        {tx.debt_person_name ? ` · ${tx.debt_person_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {tx.account_name}
                        {tx.destination_name ? ` → ${tx.destination_name}` : ''} ·{' '}
                        {formatDisplayDate(tx.date, language)}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <CurrencyAmount
                        amount={tx.amount}
                        currency={tx.currency}
                        tone={getToneForTx(tx)}
                        showSign={tx.kind === 'income' || tx.kind === 'debt_in'}
                        className="text-sm font-semibold"
                      />
                      {tx.kind === 'exchange' && tx.received_amount && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          →{' '}
                          <CurrencyAmount
                            amount={tx.received_amount}
                            currency={receivedCurrency}
                            tone="positive"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {tx.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{tx.note}</p>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {isDebtTx(tx) ? (
                      tx.debt ? (
                        <button
                          type="button"
                          onClick={() => onOpenDebt(tx.debt!)}
                          className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                        >
                          <span>{t.activity.openDebt}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : null
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setModalOpen(true);
                          }}
                          className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{t.common.edit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(tx);
                          }}
                          className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.common.delete}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 pb-4">
            <Pagination
              page={filters.page}
              count={data.count}
              hasNext={Boolean(data.next)}
              hasPrevious={Boolean(data.previous)}
              onPageChange={(nextPage) => setFilterField('page', nextPage)}
            />
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTransaction={editingTx}
        onSaved={loadTransactions}
        onRefreshConflict={loadTransactions}
      />

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={{
          account: filters.account || undefined,
          category: filters.category || undefined,
          kind: filters.kind || undefined,
          currency: filters.currency || undefined,
          start: filters.start || undefined,
          end: filters.end || undefined,
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t.activity.deleteConfirmTitle}
        body={
          deleteTarget
            ? format(t.activity.deleteConfirmBody, {
                kind: t.activity.kinds[deleteTarget.kind],
                amount: formatMoney(deleteTarget.amount, deleteTarget.currency, language),
              })
            : ''
        }
        confirmLabel={t.common.delete}
        destructive
        busy={deleting}
        error={deleteError}
      />
    </div>
  );
}
