import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ApiError, refreshCsrfToken } from '../../api/client';
import { authApi } from '../../api/endpoints';
import { readPendingEmail, useAuth, writePendingEmail } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { getDeviceTimezone } from '../../utils/date';
import { ErrorAlert } from '../../components/ui/ErrorAlert';

type AuthMode =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'forgot-request'
  | 'forgot-verify'
  | 'forgot-complete';

export function AuthFlow() {
  const { t, language } = useI18n();
  const {
    twoFactorPending,
    backendUnavailable,
    authError,
    refreshSession,
    setAuthenticatedUser,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(() =>
    readPendingEmail() ? 'verify-email' : 'login'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState(() => readPendingEmail());
  const [verifyCode, setVerifyCode] = useState('');

  // 2FA login challenge
  const [useRecovery, setUseRecovery] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Password reset
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const res = await authApi.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      await refreshCsrfToken();
      if (res.two_factor_required) {
        setAuthenticatedUser(null, true);
        setTwoFactorCode('');
        setUseRecovery(false);
        return;
      }
      if (res.user) {
        setAuthenticatedUser(res.user, false);
      } else {
        await refreshSession();
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const trimmedEmail = regEmail.trim();
      await authApi.register({
        display_name: regName.trim(),
        email: trimmedEmail,
        password: regPassword,
        language,
        timezone: getDeviceTimezone(),
      });
      writePendingEmail(trimmedEmail);
      setPendingEmail(trimmedEmail);
      setVerifyCode('');
      setMode('verify-email');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const res = await authApi.verifyEmail(verifyCode.trim());
      await refreshCsrfToken();
      writePendingEmail('');
      if (res.user) {
        setAuthenticatedUser(res.user, false);
      } else {
        await refreshSession();
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    clearFeedback();
    setBusy(true);
    try {
      await authApi.resendCode();
      setNotice(t.auth.codeResent);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const res = await authApi.submitTwoFactorLogin({
        otp: twoFactorCode.trim(),
        recovery: useRecovery,
      });
      await refreshCsrfToken();
      if (res.user) {
        setAuthenticatedUser(res.user, false);
      } else {
        await refreshSession();
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTwoFactor = async () => {
    clearFeedback();
    setBusy(true);
    try {
      await authApi.cancelTwoFactorLogin();
      await refreshCsrfToken();
      setAuthenticatedUser(null, false);
      setTwoFactorCode('');
      setMode('login');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      await authApi.requestPasswordReset(resetEmail.trim());
      setResetCode('');
      setMode('forgot-verify');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResetVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      await authApi.verifyPasswordResetCode(resetCode.trim());
      setResetPassword('');
      setResetPasswordConfirm('');
      setMode('forgot-complete');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResetComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (resetPassword !== resetPasswordConfirm) {
      setError(new Error(t.auth.passwordsDoNotMatch));
      return;
    }
    setBusy(true);
    try {
      await authApi.completePasswordReset(resetPassword);
      await refreshCsrfToken();
      setNotice(t.auth.resetCompleteSuccess);
      setLoginEmail(resetEmail);
      setLoginPassword('');
      setMode('login');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 inline-flex items-center gap-2">
            <img src="/penny-mark.svg" alt="" className="w-7 h-7 rounded-lg" />
            {t.appName}
          </span>

        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="hidden lg:block lg:col-span-6 space-y-5">
            <p className="text-xs font-medium tracking-wide text-emerald-700 dark:text-emerald-400">
              {t.tagline}
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance leading-tight">
              {language === 'ar'
                ? 'دفتر مالي شخصي دقيق للدينار العراقي والدولار الأمريكي.'
                : 'Quiet, exact accounting for IQD and USD.'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {language === 'ar'
                ? 'راقب حساباتك وأهداف الادخار، سجّل الدخل والمصاريف والتحويلات، وتتبّع الديون والميزانيات الشهرية والخطط المتكررة دون أي خلط بين العملتين.'
                : 'Keep Iraqi dinar and US dollar balances distinct. Track accounts, savings targets, daily activity, personal debts, monthly budgets, and recurring commitments in one private ledger.'}
            </p>
            <div className="pt-2 grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'عملتان مستقلتان' : 'Dual-currency precision'}
                </p>
                <p className="mt-0.5">
                  {language === 'ar'
                    ? 'دقة عشرية كاملة دون تحويل قسري.'
                    : 'Exact decimal strings without forced conversion.'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'تحكم كامل بالموافقة' : 'Explicit confirmations'}
                </p>
                <p className="mt-0.5">
                  {language === 'ar'
                    ? 'لا حركات متكررة تلقائية دون مراجعتك.'
                    : 'Every recurring post and export is reviewed by you.'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-5">
              {backendUnavailable && (
                <ErrorAlert
                  error={new Error(t.common.serviceUnavailable || authError || '')}
                  onRetry={() => void refreshSession()}
                />
              )}

              {notice && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200"
                >
                  {notice}
                </div>
              )}

              <ErrorAlert error={error} />

              {twoFactorPending ? (
                <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <h2 className="text-xl font-semibold">{t.auth.twoFactorTitle}</h2>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t.auth.twoFactorSubtitle}
                  </p>

                  <div>
                    <label
                      htmlFor="two-factor-input"
                      className="block text-sm font-medium mb-1.5"
                    >
                      {useRecovery ? t.auth.recoveryCode : t.auth.otpCode}
                    </label>
                    <input
                      id="two-factor-input"
                      type="text"
                      required
                      autoComplete="one-time-code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      dir="ltr"
                      placeholder={useRecovery ? 'XXXX-XXXX' : '000000'}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-base focus:border-emerald-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery(!useRecovery);
                      setTwoFactorCode('');
                      clearFeedback();
                    }}
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {useRecovery ? t.auth.useOtpCode : t.auth.useRecoveryCode}
                  </button>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {busy ? t.common.loading : t.auth.verifyTwoFactor}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleCancelTwoFactor()}
                      className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {t.auth.cancelTwoFactor}
                    </button>
                  </div>
                </form>
              ) : mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.signInTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.signInSubtitle}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
                      {t.auth.email}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      dir="ltr"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.email[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label htmlFor="login-password" className="block text-sm font-medium">
                        {t.auth.password}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          clearFeedback();
                          setResetEmail(loginEmail);
                          setMode('forgot-request');
                        }}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.auth.forgotPassword}
                      </button>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.password[0]}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.auth.signIn}
                  </button>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t.auth.noAccount}</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearFeedback();
                        setMode('register');
                      }}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {t.auth.createAccount}
                    </button>
                  </div>
                </form>
              ) : mode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.registerTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.registerSubtitle}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium mb-1.5">
                      {t.auth.displayName}
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    {fieldErrors.display_name && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.display_name[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5">
                      {t.auth.email}
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      dir="ltr"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.email[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5">
                      {t.auth.password}
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.password[0]}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.common.timezone}: <span className="font-mono-num">{getDeviceTimezone()}</span>
                  </p>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.auth.createAccount}
                  </button>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t.auth.haveAccount}</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearFeedback();
                        setMode('login');
                      }}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {t.auth.signIn}
                    </button>
                  </div>
                </form>
              ) : mode === 'verify-email' ? (
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.verifyEmailTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.verifyEmailSubtitle.replace('{email}', pendingEmail || '—')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="verify-code" className="block text-sm font-medium mb-1.5">
                      {t.auth.verifyCode}
                    </label>
                    <input
                      id="verify-code"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      dir="ltr"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="000000"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-base tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.auth.verifySubmit}
                  </button>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleResendCode()}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {t.auth.resendCode}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        writePendingEmail('');
                        setPendingEmail('');
                        clearFeedback();
                        setMode('login');
                      }}
                      className="text-slate-600 dark:text-slate-400 hover:underline"
                    >
                      {t.auth.backToSignIn}
                    </button>
                  </div>
                </form>
              ) : mode === 'forgot-request' ? (
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.resetTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.resetRequestSubtitle}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">
                      {t.auth.email}
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      dir="ltr"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.auth.sendResetCode}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setMode('login');
                    }}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    {t.auth.backToSignIn}
                  </button>
                </form>
              ) : mode === 'forgot-verify' ? (
                <form onSubmit={handleResetVerify} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.resetTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.resetVerifySubtitle}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reset-code" className="block text-sm font-medium mb-1.5">
                      {t.auth.verifyCode}
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      dir="ltr"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="000000"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-base tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.auth.verifySubmit}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setMode('forgot-request');
                    }}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    {t.common.back}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetComplete} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t.auth.resetNewPasswordTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {t.auth.resetNewPasswordSubtitle}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reset-new-pw" className="block text-sm font-medium mb-1.5">
                      {t.auth.newPassword}
                    </label>
                    <input
                      id="reset-new-pw"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="reset-confirm-pw" className="block text-sm font-medium mb-1.5">
                      {t.auth.confirmPassword}
                    </label>
                    <input
                      id="reset-confirm-pw"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.common.loading : t.common.save}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
