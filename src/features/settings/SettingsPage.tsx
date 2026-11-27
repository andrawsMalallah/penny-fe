import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, LogOut, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { clearCsrfToken, refreshCsrfToken } from '../../api/client';
import { accountsApi, authApi, settingsApi } from '../../api/endpoints';
import type {
  LanguageCode,
  PaginatedResponse,
  TwoFactorSetupPayload,
  TwoFactorStatus,
  UserSessionItem,
  AppearancePreference,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../context/ThemeContext';
import { formatDisplayDateTime } from '../../utils/date';
import type { CurrencyCode } from '../../utils/money';
import { PageHeader, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Pagination } from '../../components/ui/Pagination';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

function safeQrSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }
  return null;
}

export function SettingsPage() {
  const { t, language, setLanguage, format } = useI18n();
  const { appearance, setAppearance } = useTheme();
  const { user, settings, setSettings, refreshSession, setAuthenticatedUser } = useAuth();

  const [defaultAccount, setDefaultAccount] = useState<string>('');
  const [prefLanguage, setPrefLanguage] = useState<LanguageCode>(language);
  const [defaultCurrency, setDefaultCurrency] = useState<'' | CurrencyCode>('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsNotice, setPrefsNotice] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<unknown>(null);

  // 2FA state (kept strictly in memory)
  const [twoFaStatus, setTwoFaStatus] = useState<TwoFactorStatus | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPayload, setSetupPayload] = useState<TwoFactorSetupPayload | null>(null);
  const [setupOtp, setSetupOtp] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState<unknown>(null);

  // Disable / Regenerate 2FA modal
  const [proofModalMode, setProofModalMode] = useState<'disable' | 'regenerate' | null>(null);
  const [proofPassword, setProofPassword] = useState('');
  const [proofCode, setProofCode] = useState('');
  const [proofIsRecovery, setProofIsRecovery] = useState(false);

  // Sessions state
  const [sessionsRes, setSessionsRes] = useState<PaginatedResponse<UserSessionItem> | null>(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<unknown>(null);

  // Sign out everywhere confirm
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionCode, setDeletionCode] = useState('');
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState<unknown>(null);

  const loadSettingsData = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const [currentSettings, twoFa, sessions] = await Promise.all([
        settingsApi.get(),
        authApi.getTwoFactorStatus(),
        authApi.listSessions(sessionPage),
      ]);
      setSettings(currentSettings);
      setDefaultAccount(
        currentSettings.default_account ? String(currentSettings.default_account) : ''
      );
      setDefaultCurrency(currentSettings.default_currency || '');
      setExchangeRate(currentSettings.exchange_rate ?? '');
      setTwoFaStatus(twoFa);
      setSessionsRes(sessions);
    } catch (err) {
      setSessionsError(err);
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionPage, setSettings]);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  useEffect(() => {
    if (settings) {
      setDefaultAccount(settings.default_account ? String(settings.default_account) : '');
      setDefaultCurrency(settings.default_currency || '');
      setExchangeRate(settings.exchange_rate ?? '');
    }
  }, [settings]);

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsError(null);
    setPrefsNotice(null);
    setSavingPrefs(true);
    try {
      const updated = await settingsApi.update({
        default_account: defaultAccount ? Number(defaultAccount) : null,
        language: prefLanguage,
        default_currency: defaultCurrency,
        exchange_rate: exchangeRate.trim() || null,
      });
      setSettings(updated);
      setLanguage(updated.language);
      setPrefsNotice(t.settings.preferencesSaved);
    } catch (err) {
      setPrefsError(err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleStart2FASetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const res = await authApi.startTwoFactorSetup(setupPassword);
      setSetupPayload(res);
      setSetupPassword('');
      setSetupOtp('');
    } catch (err) {
      setTwoFaError(err);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const res = await authApi.enableTwoFactor(setupOtp.trim());
      setSetupPayload(null);
      setSetupOpen(false);
      setRecoveryCodes(res.recovery_codes);
      setCopiedCodes(false);
      setTwoFaStatus(await authApi.getTwoFactorStatus());
    } catch (err) {
      setTwoFaError(err);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleCancel2FASetup = async () => {
    setTwoFaBusy(true);
    try {
      if (setupPayload) {
        await authApi.cancelTwoFactorSetup();
      }
      setSetupPayload(null);
      setSetupPassword('');
      setSetupOtp('');
      setSetupOpen(false);
    } catch {
      setSetupOpen(false);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModalMode) return;
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const payload = {
        password: proofPassword,
        otp: proofCode.trim(),
        recovery: proofIsRecovery,
      };
      if (proofModalMode === 'disable') {
        await authApi.disableTwoFactor(payload);
        setProofModalMode(null);
      } else {
        const res = await authApi.regenerateRecoveryCodes(payload);
        setProofModalMode(null);
        setRecoveryCodes(res.recovery_codes);
        setCopiedCodes(false);
      }
      setProofPassword('');
      setProofCode('');
      setTwoFaStatus(await authApi.getTwoFactorStatus());
    } catch (err) {
      setTwoFaError(err);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await authApi.logoutAll();
      clearCsrfToken();
      await refreshCsrfToken();
      setLogoutAllOpen(false);
      await refreshSession();
    } finally {
      setLoggingOutAll(false);
    }
  };

  const requestAccountDeletion = async () => {
    setDeletionError(null);
    setDeletionBusy(true);
    try {
      await authApi.requestAccountDeletion();
      setDeletionCode('');
      setDeletionConfirmed(false);
      setDeletionOpen(true);
    } catch (error) {
      setDeletionError(error);
    } finally {
      setDeletionBusy(false);
    }
  };

  const confirmAccountDeletion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deletionConfirmed || !/^\d{6}$/.test(deletionCode)) return;
    setDeletionError(null);
    setDeletionBusy(true);
    try {
      await authApi.confirmAccountDeletion(deletionCode);
      clearCsrfToken();
      setDeletionOpen(false);
      setDeletionCode('');
      setAuthenticatedUser(null);
    } catch (error) {
      setDeletionError(error);
    } finally {
      setDeletionBusy(false);
    }
  };

  const qrImageSrc = setupPayload?.qr_code ? safeQrSrc(setupPayload.qr_code) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preferences */}
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold">{t.settings.preferencesTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.display_name} · <span dir="ltr">{user?.email}</span>
          </p>

          {prefsNotice && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200"
            >
              {prefsNotice}
            </div>
          )}

          <ErrorAlert error={prefsError} />

          <form onSubmit={handleSavePrefs} className="space-y-4">
            <fieldset>
              <legend className="block text-sm font-medium mb-1.5">{t.common.appearance}</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['system', 'light', 'dark'] as AppearancePreference[]).map((preference) => (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => setAppearance(preference)}
                    aria-pressed={appearance === preference}
                    className={`min-h-[44px] rounded-lg border px-2 text-sm font-medium transition-colors ${appearance === preference ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-slate-300 dark:border-slate-700'}`}
                  >
                    {t.common[preference]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="set-lang" className="block text-sm font-medium mb-1.5">
                {t.common.language}
              </label>
              <select
                id="set-lang"
                value={prefLanguage}
                onChange={(e) => setPrefLanguage(e.target.value as LanguageCode)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="en">{t.common.en}</option>
                <option value="ar">{t.common.ar}</option>
              </select>
            </div>

            <div>
              <label htmlFor="set-acc" className="block text-sm font-medium mb-1.5">
                {t.settings.defaultAccount}
              </label>
              <SearchableSelect
                id="set-acc"
                label={t.settings.defaultAccount}
                value={defaultAccount}
                onChange={setDefaultAccount}
                loadPage={(page) => accountsApi.listAccounts({ archived: 'false', page })}
                getById={accountsApi.getAccount}
                getLabel={(account) => account.name}
                emptyLabel={t.common.none}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="set-curr" className="block text-sm font-medium mb-1.5">
                  {t.settings.defaultCurrency}
                </label>
                <select
                  id="set-curr"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value as '' | CurrencyCode)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="">{t.common.none}</option>
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label htmlFor="set-rate" className="block text-sm font-medium mb-1.5">
                  {t.settings.preferredRate}
                </label>
                <input
                  id="set-rate"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="1310.000000"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.settings.preferredRateHint}
            </p>

            <button
              type="submit"
              disabled={savingPrefs}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {savingPrefs ? t.common.loading : t.settings.savePreferences}
            </button>
          </form>
        </section>

        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Two-Factor Authentication */}
          <section className="lg:flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t.settings.twoFactorTitle}</h2>
              {twoFaStatus && (
                <p className="mt-1 text-sm flex items-center gap-1.5">
                  {twoFaStatus.enabled ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {t.settings.twoFactorEnabled}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {format(t.settings.recoveryRemaining, { count: twoFaStatus.recovery_remaining })}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {t.settings.twoFactorDisabled}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <ul className="list-disc space-y-1.5 ps-5 text-sm text-slate-600 dark:text-slate-400">
            <li>{t.settings.twoFactorSignInHint}</li>
            <li>{t.settings.twoFactorRecoveryHint}</li>
          </ul>

          {twoFaStatus && !twoFaStatus.enabled && (
            <button
              type="button"
              onClick={() => {
                setTwoFaError(null);
                setSetupPayload(null);
                setSetupPassword('');
                setSetupOpen(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
            >
              {t.settings.enableTwoFactor}
            </button>
          )}

          {twoFaStatus && twoFaStatus.enabled && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTwoFaError(null);
                  setProofPassword('');
                  setProofCode('');
                  setProofIsRecovery(false);
                  setProofModalMode('regenerate');
                }}
                className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.settings.regenerateCodes}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFaError(null);
                  setProofPassword('');
                  setProofCode('');
                  setProofIsRecovery(false);
                  setProofModalMode('disable');
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                {t.settings.disableTwoFactor}
              </button>
            </div>
          )}
          </section>
          <section className="lg:flex-1 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
                {t.settings.deleteAccountTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {t.settings.deleteAccountDescription}
              </p>
            </div>
            <ul className="list-disc space-y-1.5 ps-5 text-sm text-slate-600 dark:text-slate-400">
              <li>{t.settings.deletionDataHint}</li>
              <li>{t.settings.deletionIrreversibleHint}</li>
            </ul>
            <ErrorAlert error={deletionOpen ? null : deletionError} />
            <button
              type="button"
              disabled={deletionBusy}
              onClick={() => void requestAccountDeletion()}
              className="min-h-[44px] px-4 py-2 inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deletionBusy && !deletionOpen ? t.common.loading : t.settings.requestDeletionCode}
            </button>
          </section>
        </div>
      </div>

      {/* Active Sessions */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t.settings.sessionsTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.settings.sessionsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLogoutAllOpen(true)}
            className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap self-start"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.settings.signOutEverywhere}</span>
          </button>
        </div>

        <ErrorAlert error={sessionsError} onRetry={() => void loadSettingsData()} />

        {sessionsLoading ? (
          <LoadingRows rows={3} />
        ) : sessionsRes && sessionsRes.results.length > 0 ? (
          <>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sessionsRes.results.map((s, idx) => (
                <div
                  key={s.id ?? idx}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="text-xs tabular-nums text-slate-500">{(sessionPage - 1) * 10 + idx + 1}.</span>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {s.browser} · {s.device}
                      {s.is_current && (
                        <span className="ms-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          · {t.settings.currentSession}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.settings.signedInAt}: {formatDisplayDateTime(s.signed_in_at, language)} ·{' '}
                      {t.settings.lastActiveAt}: {formatDisplayDateTime(s.last_active_at, language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={sessionPage}
              count={sessionsRes.count}
              hasNext={Boolean(sessionsRes.next)}
              hasPrevious={Boolean(sessionsRes.previous)}
              onPageChange={setSessionPage}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500">{t.common.noData}</p>
        )}
      </section>

      <Modal
        open={deletionOpen}
        onClose={deletionBusy ? () => {} : () => { setDeletionOpen(false); setDeletionCode(''); setDeletionError(null); }}
        title={t.settings.deleteAccountTitle}
        size="sm"
      >
        <form onSubmit={confirmAccountDeletion} className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">{t.settings.deletionCodeSent}</p>
          <ErrorAlert error={deletionError} />
          <div>
            <label htmlFor="account-deletion-code" className="block text-sm font-medium mb-1.5">
              {t.settings.deletionEmailCode}
            </label>
            <input
              id="account-deletion-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              dir="ltr"
              value={deletionCode}
              onChange={(event) => setDeletionCode(event.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-base tracking-widest"
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              required
              checked={deletionConfirmed}
              onChange={(event) => setDeletionConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-red-600"
            />
            <span>{t.settings.deletionFinalConfirmation}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={deletionBusy}
              onClick={() => { setDeletionOpen(false); setDeletionCode(''); setDeletionError(null); }}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={deletionBusy || !deletionConfirmed || !/^\d{6}$/.test(deletionCode)}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deletionBusy ? t.common.loading : t.settings.confirmDeleteAccount}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        open={setupOpen}
        onClose={twoFaBusy ? () => {} : () => void handleCancel2FASetup()}
        title={t.settings.enableTwoFactor}
        size="md"
      >
        <ErrorAlert error={twoFaError} />

        {!setupPayload ? (
          <form onSubmit={handleStart2FASetup} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.settings.setupStep1Hint}
            </p>
            <div>
              <label htmlFor="tfa-setup-pw" className="block text-sm font-medium mb-1.5">
                {t.settings.currentPassword}
              </label>
              <input
                id="tfa-setup-pw"
                type="password"
                required
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleCancel2FASetup()}
                className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={twoFaBusy}
                className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {twoFaBusy ? t.common.loading : t.common.confirm}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEnable2FA} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.settings.setupStep2Hint}
            </p>

            {qrImageSrc && (
              <div className="flex justify-center p-4 bg-white rounded-xl border border-slate-200">
                <img
                  src={qrImageSrc}
                  alt="Authenticator QR code"
                  className="w-44 h-44 object-contain"
                />
              </div>
            )}

            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1">
                {t.settings.manualSecret}
              </span>
              <code
                dir="ltr"
                className="block w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num text-xs break-all select-all"
              >
                {setupPayload.secret}
              </code>
            </div>

            <div>
              <label htmlFor="tfa-setup-otp" className="block text-sm font-medium mb-1.5">
                {t.auth.otpCode}
              </label>
              <input
                id="tfa-setup-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                dir="ltr"
                value={setupOtp}
                onChange={(e) => setSetupOtp(e.target.value)}
                placeholder="000000"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-base tracking-widest"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={twoFaBusy}
                onClick={() => void handleCancel2FASetup()}
                className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
              >
                {t.settings.cancelSetup}
              </button>
              <button
                type="submit"
                disabled={twoFaBusy}
                className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {twoFaBusy ? t.common.loading : t.settings.verifyAndEnable}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Disable / Regenerate Proof Modal */}
      <Modal
        open={Boolean(proofModalMode)}
        onClose={twoFaBusy ? () => {} : () => setProofModalMode(null)}
        title={
          proofModalMode === 'disable'
            ? t.settings.disableTwoFactor
            : t.settings.regenerateCodes
        }
        size="sm"
      >
        <form onSubmit={handleProofSubmit} className="space-y-4">
          <ErrorAlert error={twoFaError} />

          <div>
            <label htmlFor="proof-pw" className="block text-sm font-medium mb-1.5">
              {t.settings.currentPassword}
            </label>
            <input
              id="proof-pw"
              type="password"
              required
              value={proofPassword}
              onChange={(e) => setProofPassword(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label htmlFor="proof-code" className="block text-sm font-medium mb-1.5">
              {proofIsRecovery ? t.auth.recoveryCode : t.auth.otpCode}
            </label>
            <input
              id="proof-code"
              type="text"
              required
              dir="ltr"
              value={proofCode}
              onChange={(e) => setProofCode(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setProofIsRecovery(!proofIsRecovery);
                setProofCode('');
              }}
              className="mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {proofIsRecovery ? t.auth.useOtpCode : t.auth.useRecoveryCode}
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={twoFaBusy}
              onClick={() => setProofModalMode(null)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={twoFaBusy}
              className={`min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg text-white ${
                proofModalMode === 'disable'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {twoFaBusy ? t.common.loading : t.common.confirm}
            </button>
          </div>
        </form>
      </Modal>

      {/* One-time Recovery Codes Modal (never persisted) */}
      <Modal
        open={Boolean(recoveryCodes)}
        onClose={() => setRecoveryCodes(null)}
        title={t.settings.saveRecoveryTitle}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                if (!recoveryCodes) return;
                void navigator.clipboard?.writeText(recoveryCodes.join('\n')).then(() => {
                  setCopiedCodes(true);
                });
              }}
              className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCodes ? t.settings.codesCopied : t.settings.copyCodes}</span>
            </button>
            <button
              type="button"
              onClick={() => setRecoveryCodes(null)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {t.settings.doneSaved}
            </button>
          </>
        }
      >
        <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          {t.settings.saveRecoveryWarning}
        </p>
        {recoveryCodes && (
          <div
            dir="ltr"
            className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num text-sm"
          >
            {recoveryCodes.map((code) => (
              <div key={code} className="py-1 text-center select-all">
                {code}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        onConfirm={handleLogoutAll}
        title={t.settings.signOutEverywhereTitle}
        body={t.settings.signOutEverywhereBody}
        confirmLabel={t.settings.signOutEverywhere}
        destructive
        busy={loggingOutAll}
      />
    </div>
  );
}
