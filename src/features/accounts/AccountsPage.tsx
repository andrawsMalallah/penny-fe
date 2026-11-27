import React, { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { accountsApi } from '../../api/endpoints';
import type {
  Account,
  AccountGroup,
  ExpenseCategory,
  PaginatedResponse,
} from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { formatDisplayDate, getDeviceTimezone } from '../../utils/date';
import { computePercentRatio, isPositiveDecimal } from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

type SetupTab = 'accounts' | 'groups' | 'categories';
type ArchiveFilter = 'false' | 'true' | 'all';

export function AccountsPage() {
  const { t, language, format, categoryLabel } = useI18n();
  const [tab, setTab] = useState<SetupTab>('accounts');
  const [archivedFilter, setArchivedFilter] = useState<ArchiveFilter>('false');
  const [page, setPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<AccountGroup | null>(null);
  const [ungroupedOnly, setUngroupedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const [accountsRes, setAccountsRes] = useState<PaginatedResponse<Account> | null>(null);
  const [groupsRes, setGroupsRes] = useState<PaginatedResponse<AccountGroup> | null>(null);
  const [categoriesRes, setCategoriesRes] = useState<PaginatedResponse<ExpenseCategory> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Account create/edit modal
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accGroup, setAccGroup] = useState('');
  const [openingIqd, setOpeningIqd] = useState('0.00');
  const [openingUsd, setOpeningUsd] = useState('0.00');
  const [targetIqd, setTargetIqd] = useState('');
  const [targetUsd, setTargetUsd] = useState('');
  const [accBusy, setAccBusy] = useState(false);
  const [accError, setAccError] = useState<unknown>(null);

  // Group modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupError, setGroupError] = useState<unknown>(null);

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<unknown>(null);

  // Confirmation dialogs (archive/restore, initialize categories)
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'accounts') {
        setAccountsRes(await accountsApi.listAccounts({
          archived: archivedFilter,
          group: ungroupedOnly ? 'none' : selectedGroup?.id,
          search: debouncedSearch || undefined,
          page,
        }));
      } else if (tab === 'groups') {
        setGroupsRes(await accountsApi.listGroups({ archived: archivedFilter, search: debouncedSearch || undefined, page }));
      } else {
        setCategoriesRes(await accountsApi.listCategories({ archived: archivedFilter, search: debouncedSearch || undefined, page }));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tab, archivedFilter, page, selectedGroup, ungroupedOnly, debouncedSearch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAccountModal = (acc: Account | null) => {
    setEditingAccount(acc);
    setAccError(null);
    if (acc) {
      setAccName(acc.name);
      setAccGroup(acc.group ? String(acc.group) : '');
      setTargetIqd(acc.target_iqd ?? '');
      setTargetUsd(acc.target_usd ?? '');
    } else {
      setAccName('');
      setAccGroup('');
      setOpeningIqd('0.00');
      setOpeningUsd('0.00');
      setTargetIqd('');
      setTargetUsd('');
    }
    setAccModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError(null);
    setAccBusy(true);
    try {
      if (editingAccount) {
        await accountsApi.updateAccount(editingAccount.id, {
          name: accName.trim(),
          group: accGroup ? Number(accGroup) : null,
          target_iqd: targetIqd.trim() || null,
          target_usd: targetUsd.trim() || null,
          target_version: editingAccount.target_version,
        });
      } else {
        await accountsApi.createAccount({
          name: accName.trim(),
          group: accGroup ? Number(accGroup) : null,
          opening_iqd: openingIqd.trim() || '0.00',
          opening_usd: openingUsd.trim() || '0.00',
          timezone: getDeviceTimezone(),
          target_iqd: targetIqd.trim() || null,
          target_usd: targetUsd.trim() || null,
        });
      }
      setAccModalOpen(false);
      await loadData();
    } catch (err) {
      setAccError(err);
    } finally {
      setAccBusy(false);
    }
  };

  const openGroupModal = (group: AccountGroup | null) => {
    setEditingGroup(group);
    setGroupName(group ? group.name : '');
    setGroupError(null);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    setGroupBusy(true);
    try {
      if (editingGroup) {
        await accountsApi.updateGroup(editingGroup.id, groupName.trim());
      } else {
        await accountsApi.createGroup(groupName.trim());
      }
      setGroupModalOpen(false);
      await loadData();
    } catch (err) {
      setGroupError(err);
    } finally {
      setGroupBusy(false);
    }
  };

  const openCatModal = (cat: ExpenseCategory | null) => {
    setEditingCat(cat);
    setCatNameEn(cat ? cat.name_en : '');
    setCatNameAr(cat ? cat.name_ar : '');
    setCatError(null);
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!catNameEn.trim() && !catNameAr.trim()) {
      setCatError(new Error(t.accounts.atLeastOneCategoryName));
      return;
    }
    setCatBusy(true);
    try {
      const payload = {
        name_en: catNameEn.trim(),
        name_ar: catNameAr.trim(),
      };
      if (editingCat) {
        await accountsApi.updateCategory(editingCat.id, payload);
      } else {
        await accountsApi.createCategory(payload);
      }
      setCatModalOpen(false);
      await loadData();
    } catch (err) {
      setCatError(err);
    } finally {
      setCatBusy(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await confirmState.action();
      setConfirmState(null);
      if (tab === 'accounts' && accountsRes?.results.length === 1 && page > 1) setPage(page - 1);
      else await loadData();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const accFieldErrors = accError instanceof ApiError ? accError.fieldErrors : {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.accounts.title}
        subtitle={t.accounts.subtitle}
        actions={
          <>
            {tab === 'categories' && (
              <button
                type="button"
                onClick={() => {
                  setConfirmError(null);
                  setConfirmState({
                    title: t.accounts.initializeCategoriesConfirmTitle,
                    body: t.accounts.initializeCategoriesConfirmBody,
                    confirmLabel: t.accounts.initializeCategories,
                    action: async () => {
                      await accountsApi.initializeCategories();
                      setNotice(t.accounts.categoriesInitialized);
                    },
                  });
                }}
                className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.accounts.initializeCategories}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (tab === 'accounts') openAccountModal(null);
                else if (tab === 'groups') openGroupModal(null);
                else openCatModal(null);
              }}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>
                {tab === 'accounts'
                  ? t.accounts.newAccount
                  : tab === 'groups'
                    ? t.accounts.newGroup
                    : t.accounts.newCategory}
              </span>
            </button>
          </>
        }
      />

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {notice}
        </div>
      )}

      {/* Tabs + Archive Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          className="penny-page-tabs bg-slate-200/70 dark:bg-slate-800/80"
        >
          {(
            [
              { key: 'accounts', label: t.accounts.tabAccounts },
              { key: 'groups', label: t.accounts.tabGroups },
              { key: 'categories', label: t.accounts.tabCategories },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => {
                setTab(item.key);
                setPage(1);
                setNotice(null);
                setSearch('');
                if (item.key !== 'accounts') { setSelectedGroup(null); setUngroupedOnly(false); }
              }}
              className={`min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === item.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="penny-page-tabs bg-slate-200/70 dark:bg-slate-800/80">
          {(
            [
              { key: 'false', label: t.common.active },
              { key: 'archived', label: t.common.archived, value: 'true' as const },
              { key: 'all', label: t.common.all, value: 'all' as const },
            ] as const
          ).map((opt) => {
            const val: ArchiveFilter = 'value' in opt ? opt.value : 'false';
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setArchivedFilter(val);
                  setPage(1);
                }}
                className={`min-h-[44px] px-1.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  archivedFilter === val
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-md">
        <label htmlFor="setup-search" className="block text-sm font-medium mb-2">
          {tab === 'accounts' ? t.common.account : tab === 'groups' ? t.common.group : t.common.category}
        </label>
        <input id="setup-search" type="search" maxLength={100} value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder={t.common.search}
          className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
      </div>

      <ErrorAlert error={error} onRetry={() => void loadData()} />

      {tab === 'accounts' && (selectedGroup || ungroupedOnly) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>
            {t.accounts.groupName}:{' '}
            <strong className="text-slate-900 dark:text-slate-100">{ungroupedOnly ? t.analytics.ungrouped : selectedGroup?.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => { setSelectedGroup(null); setUngroupedOnly(false); setPage(1); }}
            className="min-h-[40px] px-2 text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
          >
            {t.common.resetFilters}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingRows rows={4} />
      ) : tab === 'accounts' ? (
        !accountsRes || accountsRes.results.length === 0 ? (
          <EmptyState title={t.common.noData} />
        ) : (
          <div className="penny-content-enter space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accountsRes.results.map((acc, index) => {
                const hasIqdTarget = isPositiveDecimal(acc.target_iqd);
                const hasUsdTarget = isPositiveDecimal(acc.target_usd);
                const iqdPct = hasIqdTarget
                  ? Math.min(100, computePercentRatio(acc.balance_iqd, acc.target_iqd))
                  : 0;
                const usdPct = hasUsdTarget
                  ? Math.min(100, computePercentRatio(acc.balance_usd, acc.target_usd))
                  : 0;
                return (
                  <div
                    key={acc.id}
                    className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 ${
                      acc.archived ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="text-xs tabular-nums text-slate-500 pt-1">{(page - 1) * 10 + index + 1}.</span>
                        <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {acc.group_name || t.analytics.ungrouped} ·{' '}
                          {format(t.accounts.openingRecorded, {
                            date: formatDisplayDate(acc.opening?.effective_date, language),
                          })}
                          {acc.archived ? ` · ${t.common.archived}` : ''}
                        </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`${t.common.edit} ${acc.name}`}
                          onClick={() => openAccountModal(acc)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${acc.archived ? t.common.restore : t.common.archive} ${acc.name}`}
                          onClick={() => {
                            setConfirmError(null);
                            setConfirmState({
                              title: acc.archived
                                ? t.accounts.restoreAccountConfirmTitle
                                : t.accounts.archiveAccountConfirmTitle,
                              body: acc.archived
                                ? t.accounts.restoreAccountConfirmBody
                                : t.accounts.archiveAccountConfirmBody,
                              confirmLabel: acc.archived ? t.common.restore : t.common.archive,
                              destructive: !acc.archived,
                              action: async () => {
                                await accountsApi.archiveAccount(acc.id, !acc.archived);
                              },
                            });
                          }}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {acc.archived ? (
                            <ArchiveRestore className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>
                        {acc.archived && <button type="button" aria-label={`${t.common.delete} ${acc.name}`} onClick={() => {
                          setConfirmError(null);
                          setConfirmState({
                            title: t.accounts.deleteArchivedTitle,
                            body: t.accounts.deleteArchivedBody,
                            confirmLabel: t.common.delete,
                            destructive: true,
                            action: () => accountsApi.deleteAccount(acc.id),
                          });
                        }} className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">IQD</span>
                        <div className="text-lg font-semibold mt-0.5">
                          <CurrencyAmount amount={acc.balance_iqd} currency="IQD" />
                        </div>
                        {hasIqdTarget && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                <CurrencyAmount amount={acc.target_iqd} currency="IQD" />
                              </span>
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
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">USD</span>
                        <div className="text-lg font-semibold mt-0.5">
                          <CurrencyAmount amount={acc.balance_usd} currency="USD" />
                        </div>
                        {hasUsdTarget && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                <CurrencyAmount amount={acc.target_usd} currency="USD" />
                              </span>
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
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={page}
              count={accountsRes.count}
              hasNext={Boolean(accountsRes.next)}
              hasPrevious={Boolean(accountsRes.previous)}
              onPageChange={setPage}
            />
          </div>
        )
      ) : tab === 'groups' ? (
        groupsRes && (
          <div className="penny-content-enter bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {archivedFilter !== 'true' && page === 1 &&
              (!search || t.analytics.ungrouped.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) && (
              <div className="p-4 flex items-center gap-3">
                <span className="text-xs tabular-nums text-slate-500">—</span>
                <button type="button" onClick={() => { setSelectedGroup(null); setUngroupedOnly(true); setArchivedFilter('all'); setTab('accounts'); setPage(1); setSearch(''); }}
                  className="text-start text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                  {t.analytics.ungrouped}
                </button>
              </div>
            )}
            {groupsRes.results.map((grp, index) => (
              <div key={grp.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">{(page - 1) * 10 + index + 1}.</span>
                  <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup(grp);
                      setUngroupedOnly(false);
                      setArchivedFilter('all');
                      setTab('accounts');
                      setPage(1);
                    }}
                    className="text-start text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {grp.name}
                  </button>
                  {grp.archived && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.common.archived}</p>
                  )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`${t.common.edit} ${grp.name}`}
                    onClick={() => openGroupModal(grp)}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${grp.archived ? t.common.restore : t.common.archive} ${grp.name}`}
                    onClick={() => {
                      setConfirmError(null);
                      setConfirmState({
                        title: grp.archived
                          ? t.common.restore
                          : t.accounts.archiveGroupConfirmTitle,
                        body: t.accounts.archiveGroupConfirmBody,
                        confirmLabel: grp.archived ? t.common.restore : t.common.archive,
                        destructive: !grp.archived,
                        action: async () => {
                          await accountsApi.archiveGroup(grp.id, !grp.archived);
                        },
                      });
                    }}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {grp.archived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            <div className="px-4 pb-4">
              <Pagination
                page={page}
                count={groupsRes.count}
                hasNext={Boolean(groupsRes.next)}
                hasPrevious={Boolean(groupsRes.previous)}
                onPageChange={setPage}
              />
            </div>
          </div>
        )
      ) : !categoriesRes || categoriesRes.results.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <div className="penny-content-enter bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {categoriesRes.results.map((cat, index) => (
            <div key={cat.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                <span className="text-xs tabular-nums text-slate-500 pt-1">{(page - 1) * 10 + index + 1}.</span>
                <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {categoryLabel(cat)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {[cat.name_en, cat.name_ar].filter(Boolean).join(' · ')}
                  {cat.archived ? ` · ${t.common.archived}` : ''}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label={`${t.common.edit} ${categoryLabel(cat)}`}
                  onClick={() => openCatModal(cat)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${cat.archived ? t.common.restore : t.common.archive} ${categoryLabel(cat)}`}
                  onClick={() => {
                    setConfirmError(null);
                    setConfirmState({
                      title: cat.archived
                        ? t.common.restore
                        : t.accounts.archiveCategoryConfirmTitle,
                      body: t.accounts.archiveCategoryConfirmBody,
                      confirmLabel: cat.archived ? t.common.restore : t.common.archive,
                      destructive: !cat.archived,
                      action: async () => {
                        await accountsApi.archiveCategory(cat.id, !cat.archived);
                      },
                    });
                  }}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {cat.archived ? (
                    <ArchiveRestore className="w-4 h-4" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              count={categoriesRes.count}
              hasNext={Boolean(categoriesRes.next)}
              hasPrevious={Boolean(categoriesRes.previous)}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Account Create / Edit + Targets Modal */}
      <Modal
        open={accModalOpen}
        onClose={accBusy ? () => {} : () => setAccModalOpen(false)}
        title={editingAccount ? t.accounts.editAccount : t.accounts.newAccount}
        footer={
          <>
            <button
              type="button"
              disabled={accBusy}
              onClick={() => setAccModalOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="account-form"
              disabled={accBusy}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {accBusy ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="account-form" onSubmit={handleSaveAccount} className="space-y-4">
          <ErrorAlert
            error={accError}
            onRefreshConflict={() => {
              setAccModalOpen(false);
              void loadData();
            }}
          />

          <div>
            <label htmlFor="acc-name" className="block text-sm font-medium mb-1.5">
              {t.accounts.accountName}
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
            {accFieldErrors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {accFieldErrors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="acc-group" className="block text-sm font-medium mb-1.5">
              {t.common.group} <span className="text-xs text-slate-500">({t.common.optional})</span>
            </label>
            <SearchableSelect
              id="acc-group"
              label={t.common.group}
              value={accGroup}
              onChange={setAccGroup}
              loadPage={(page) => accountsApi.listGroups({ archived: 'false', page })}
              getById={accountsApi.getGroup}
              getLabel={(group) => group.name}
              emptyLabel={t.common.none}
            />
          </div>

          {!editingAccount && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="acc-open-iqd" className="block text-sm font-medium mb-1.5">
                    {t.accounts.openingIqd}
                  </label>
                  <input
                    id="acc-open-iqd"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={openingIqd}
                    onChange={(e) => setOpeningIqd(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="acc-open-usd" className="block text-sm font-medium mb-1.5">
                    {t.accounts.openingUsd}
                  </label>
                  <input
                    id="acc-open-usd"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={openingUsd}
                    onChange={(e) => setOpeningUsd(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.accounts.openingHint}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="acc-target-iqd" className="block text-sm font-medium mb-1.5">
                  {t.accounts.targetIqd}
                </label>
                <input
                  id="acc-target-iqd"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={targetIqd}
                  onChange={(e) => setTargetIqd(e.target.value)}
                  placeholder="—"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                />
              </div>
              <div>
                <label htmlFor="acc-target-usd" className="block text-sm font-medium mb-1.5">
                  {t.accounts.targetUsd}
                </label>
                <input
                  id="acc-target-usd"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={targetUsd}
                  onChange={(e) => setTargetUsd(e.target.value)}
                  placeholder="—"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.accounts.targetHint}
            </p>
          </div>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal
        open={groupModalOpen}
        onClose={groupBusy ? () => {} : () => setGroupModalOpen(false)}
        title={editingGroup ? t.accounts.editGroup : t.accounts.newGroup}
        size="sm"
        footer={
          <>
            <button
              type="button"
              disabled={groupBusy}
              onClick={() => setGroupModalOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="group-form"
              disabled={groupBusy}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {groupBusy ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="group-form" onSubmit={handleSaveGroup} className="space-y-4">
          <ErrorAlert error={groupError} />
          <div>
            <label htmlFor="grp-name" className="block text-sm font-medium mb-1.5">
              {t.accounts.groupName}
            </label>
            <input
              id="grp-name"
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        open={catModalOpen}
        onClose={catBusy ? () => {} : () => setCatModalOpen(false)}
        title={editingCat ? t.accounts.editCategory : t.accounts.newCategory}
        size="sm"
        footer={
          <>
            <button
              type="button"
              disabled={catBusy}
              onClick={() => setCatModalOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="category-form"
              disabled={catBusy}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {catBusy ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSaveCategory} className="space-y-4">
          <ErrorAlert error={catError} />
          <div>
            <label htmlFor="cat-en" className="block text-sm font-medium mb-1.5">
              {t.accounts.nameEn}
            </label>
            <input
              id="cat-en"
              type="text"
              dir="ltr"
              value={catNameEn}
              onChange={(e) => setCatNameEn(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="cat-ar" className="block text-sm font-medium mb-1.5">
              {t.accounts.nameAr}
            </label>
            <input
              id="cat-ar"
              type="text"
              dir="rtl"
              value={catNameAr}
              onChange={(e) => setCatNameAr(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.accounts.atLeastOneCategoryName}
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={runConfirmedAction}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        destructive={confirmState?.destructive}
        busy={confirmBusy}
        error={confirmError}
      />
    </div>
  );
}
