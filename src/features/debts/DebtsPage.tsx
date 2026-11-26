import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Users } from 'lucide-react';
import { ApiError } from '../../api/client';
import { accountsApi, debtsApi } from '../../api/endpoints';
import type {
  Account,
  Debt,
  DebtDirection,
  DebtOrigin,
  DebtPerson,
  PaginatedResponse,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { formatDisplayDate, getDeviceTimezone, todayYMD } from '../../utils/date';
import type { CurrencyCode } from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';

interface DebtsPageProps {
  onOpenDebt: (id: number) => void;
}

export function DebtsPage({ onOpenDebt }: DebtsPageProps) {
  const { t, language, dir, format } = useI18n();
  const { settings } = useAuth();

  const [tab, setTab] = useState<'debts' | 'people'>('debts');
  const [direction, setDirection] = useState<'' | DebtDirection>('');
  const [currency, setCurrency] = useState<'' | CurrencyCode>('');
  const [status, setStatus] = useState<'open' | 'settled' | 'all'>('open');
  const [personFilter, setPersonFilter] = useState('');
  const [page, setPage] = useState(1);

  const [debtsRes, setDebtsRes] = useState<PaginatedResponse<Debt> | null>(null);
  const [peopleRes, setPeopleRes] = useState<PaginatedResponse<DebtPerson> | null>(null);
  const [allPeople, setAllPeople] = useState<DebtPerson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Create debt modal
  const [createOpen, setCreateOpen] = useState(false);
  const [personMode, setPersonMode] = useState<'existing' | 'new'>('new');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newDirection, setNewDirection] = useState<DebtDirection>('owed_to_me');
  const [newOrigin, setNewOrigin] = useState<DebtOrigin>('movement');
  const [newAccountId, setNewAccountId] = useState('');
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('IQD');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => todayYMD());
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [peopleList, accs] = await Promise.all([
        accountsApi.listAllDebtPeople('all'),
        accountsApi.listAllAccounts('false'),
      ]);
      setAllPeople(peopleList);
      setAccounts(accs);

      if (tab === 'debts') {
        const res = await debtsApi.list({
          person: personFilter || undefined,
          direction: direction || undefined,
          currency: currency || undefined,
          status,
          page,
        });
        setDebtsRes(res);
      } else {
        const res = await accountsApi.listDebtPeople({ page });
        setPeopleRes(res);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tab, personFilter, direction, currency, status, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setCreateError(null);
    setPersonMode(allPeople.length > 0 ? 'existing' : 'new');
    setSelectedPersonId(allPeople.length > 0 ? String(allPeople[0].id) : '');
    setNewPersonName('');
    setNewDirection('owed_to_me');
    setNewOrigin('movement');
    setNewAccountId(
      settings?.default_account
        ? String(settings.default_account)
        : accounts.length > 0
          ? String(accounts[0].id)
          : ''
    );
    setNewCurrency(settings?.default_currency === 'USD' ? 'USD' : 'IQD');
    setNewAmount('');
    setNewDate(todayYMD());
    setNewNote('');
    setCreateOpen(true);
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await debtsApi.create({
        person: personMode === 'existing' && selectedPersonId ? Number(selectedPersonId) : undefined,
        person_name: personMode === 'new' ? newPersonName.trim() : undefined,
        direction: newDirection,
        origin: newOrigin,
        account: newOrigin === 'movement' && newAccountId ? Number(newAccountId) : null,
        currency: newCurrency,
        amount: newAmount.trim(),
        date: newDate,
        note: newNote.trim(),
        timezone: getDeviceTimezone(),
      });
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      setCreateError(err);
    } finally {
      setCreating(false);
    }
  };

  const fieldErrors = createError instanceof ApiError ? createError.fieldErrors : {};
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.debts.title}
        subtitle={t.debts.subtitle}
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.debts.newDebt}</span>
          </button>
        }
      />

      {/* Tabs */}
      <div
        role="tablist"
        className="penny-page-tabs bg-slate-200/70 dark:bg-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'debts'}
          onClick={() => {
            setTab('debts');
            setPage(1);
          }}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            tab === 'debts'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.debts.tabDebts}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'people'}
          onClick={() => {
            setTab('people');
            setPage(1);
          }}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            tab === 'people'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.debts.tabPeople}
        </button>
      </div>

      {tab === 'debts' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="debt-f-dir" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.debts.direction}
              </label>
              <select
                id="debt-f-dir"
                value={direction}
                onChange={(e) => {
                  setDirection(e.target.value as '' | DebtDirection);
                  setPage(1);
                }}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">{t.common.all}</option>
                <option value="owed_to_me">{t.debts.owedToMe}</option>
                <option value="i_owe">{t.debts.iOwe}</option>
              </select>
            </div>

            <div>
              <label htmlFor="debt-f-status" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.common.status}
              </label>
              <select
                id="debt-f-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as 'open' | 'settled' | 'all');
                  setPage(1);
                }}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="open">{t.debts.statusOpen}</option>
                <option value="settled">{t.debts.statusSettled}</option>
                <option value="all">{t.common.all}</option>
              </select>
            </div>

            <div>
              <label htmlFor="debt-f-curr" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.common.currency}
              </label>
              <select
                id="debt-f-curr"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as '' | CurrencyCode);
                  setPage(1);
                }}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">{t.common.all}</option>
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label htmlFor="debt-f-person" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.debts.person}
              </label>
              <select
                id="debt-f-person"
                value={personFilter}
                onChange={(e) => {
                  setPersonFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">{t.common.all}</option>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      <ErrorAlert error={error} onRetry={() => void loadData()} />

      {loading ? (
        <LoadingRows rows={4} />
      ) : tab === 'debts' ? (
        !debtsRes || debtsRes.results.length === 0 ? (
          <EmptyState title={t.common.noData} />
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {debtsRes.results.map((debt) => (
                <div
                  key={debt.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {debt.person_name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {debt.direction === 'owed_to_me' ? t.debts.owedToMe : t.debts.iOwe} ·{' '}
                        {debt.status === 'settled' ? t.debts.statusSettled : t.debts.statusOpen}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDisplayDate(debt.date, language)}
                      {debt.account_name ? ` · ${debt.account_name}` : ''}
                      {' · '}
                      {format(t.debts.repaymentsCount, { count: debt.repayment_count })}
                      {debt.note ? ` · ${debt.note}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-start sm:text-end">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.debts.remaining}
                      </div>
                      <CurrencyAmount
                        amount={debt.remaining}
                        currency={debt.currency}
                        tone={debt.direction === 'owed_to_me' ? 'positive' : 'negative'}
                        className="text-base font-semibold"
                      />
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.debts.originalAmount}:{' '}
                        <CurrencyAmount amount={debt.amount} currency={debt.currency} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDebt(debt.id)}
                      className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <span>{t.common.viewDetails}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              count={debtsRes.count}
              hasNext={Boolean(debtsRes.next)}
              hasPrevious={Boolean(debtsRes.previous)}
              onPageChange={setPage}
            />
          </div>
        )
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t.debts.peopleReadOnlyHint}
          </p>
          {!peopleRes || peopleRes.results.length === 0 ? (
            <EmptyState title={t.common.noData} />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {peopleRes.results.map((person) => (
                <div key={person.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">{person.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonFilter(String(person.id));
                      setStatus('all');
                      setTab('debts');
                      setPage(1);
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                  >
                    {t.debts.tabDebts}
                  </button>
                </div>
              ))}
              <div className="px-4 pb-4">
                <Pagination
                  page={page}
                  count={peopleRes.count}
                  hasNext={Boolean(peopleRes.next)}
                  hasPrevious={Boolean(peopleRes.previous)}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Debt Modal */}
      <Modal
        open={createOpen}
        onClose={creating ? () => {} : () => setCreateOpen(false)}
        title={t.debts.newDebt}
        size="lg"
        footer={
          <>
            <button
              type="button"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="create-debt-form"
              disabled={creating}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {creating ? t.common.loading : t.common.create}
            </button>
          </>
        }
      >
        <form id="create-debt-form" onSubmit={handleCreateDebt} className="space-y-4">
          <ErrorAlert error={createError} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium mb-1.5">{t.debts.direction}</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['owed_to_me', 'i_owe'] as DebtDirection[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDirection(d)}
                    className={`min-h-[36px] rounded-md text-xs font-medium transition-colors ${
                      newDirection === d
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d === 'owed_to_me' ? t.debts.owedToMe : t.debts.iOwe}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium mb-1.5">{t.common.currency}</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['IQD', 'USD'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCurrency(c)}
                    className={`min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
                      newCurrency === c
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{t.debts.person}</span>
              {allPeople.length > 0 && (
                <div className="inline-flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPersonMode('existing')}
                    className={`font-medium ${
                      personMode === 'existing'
                        ? 'text-emerald-700 dark:text-emerald-400 underline'
                        : 'text-slate-500'
                    }`}
                  >
                    {t.debts.existingPerson}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonMode('new')}
                    className={`font-medium ${
                      personMode === 'new'
                        ? 'text-emerald-700 dark:text-emerald-400 underline'
                        : 'text-slate-500'
                    }`}
                  >
                    {t.debts.newPerson}
                  </button>
                </div>
              )}
            </div>

            {personMode === 'existing' && allPeople.length > 0 ? (
              <select
                aria-label={t.debts.existingPerson}
                required
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">—</option>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={t.debts.personName}
                type="text"
                required
                placeholder={t.debts.personName}
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            )}
            {(fieldErrors.person || fieldErrors.person_name) && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {(fieldErrors.person || fieldErrors.person_name)?.[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="debt-origin" className="block text-sm font-medium mb-1.5">
              {t.debts.origin}
            </label>
            <select
              id="debt-origin"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value as DebtOrigin)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="movement">{t.debts.originMovement}</option>
              <option value="existing">{t.debts.originExisting}</option>
            </select>
          </div>

          {newOrigin === 'movement' && (
            <div>
              <label htmlFor="debt-account" className="block text-sm font-medium mb-1.5">
                {t.common.account}
              </label>
              <select
                id="debt-account"
                required
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {fieldErrors.account && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.account[0]}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="debt-amount" className="block text-sm font-medium mb-1.5">
                {t.common.amount}
              </label>
              <input
                id="debt-amount"
                type="text"
                inputMode="decimal"
                required
                dir="ltr"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
              {fieldErrors.amount && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.amount[0]}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="debt-date" className="block text-sm font-medium mb-1.5">
                {t.common.date}
              </label>
              <input
                id="debt-date"
                type="date"
                required
                dir="ltr"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="debt-note" className="block text-sm font-medium mb-1.5">
              {t.common.note} <span className="text-xs text-slate-500">({t.common.optional})</span>
            </label>
            <input
              id="debt-note"
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
