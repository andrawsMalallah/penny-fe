import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Plus,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ErrorAlert } from '../ui/ErrorAlert';
import { useI18n } from '../../i18n/useI18n';
import type { AppRouteName } from '../../utils/router';
import { useDialogFocus } from '../ui/useDialogFocus';
import { MOBILE_PRIMARY_TABS, isRouteActive } from './navigation';

interface AppShellProps {
  currentRoute: AppRouteName;
  onNavigate: (route: AppRouteName) => void;
  onQuickAddTransaction: () => void;
  children: React.ReactNode;
}

export function AppShell({
  currentRoute,
  onNavigate,
  onQuickAddTransaction,
  children,
}: AppShellProps) {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<unknown>(null);
  const menuRef = useDialogFocus(mobileMenuOpen, () => setMobileMenuOpen(false));

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch (error) {
      setSignOutError(error);
    }
  };

  const navItems: Array<{
    key: AppRouteName;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'overview', label: t.nav.overview, icon: LayoutDashboard },
    { key: 'activity', label: t.nav.activity, icon: ArrowLeftRight },
    { key: 'accounts', label: t.nav.accounts, icon: Wallet },
    { key: 'debts', label: t.nav.debts, icon: HandCoins },
    { key: 'budgets', label: t.nav.budgets, icon: PieChart },
    { key: 'recurring', label: t.nav.recurring, icon: CalendarClock },
    { key: 'analytics', label: t.nav.analytics, icon: BarChart3 },
    { key: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const handleSelectNav = (key: AppRouteName) => {
    setMobileMenuOpen(false);
    onNavigate(key);
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-dvh">
        <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              handleSelectNav('overview');
            }}
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap inline-flex items-center gap-2.5"
          >
            <img src="/penny-mark.svg" alt="" className="w-8 h-8 rounded-lg" />
            {t.appName}
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label={t.nav.mainNavigation}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(currentRoute, item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectNav(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[42px] px-3 py-2 flex items-center gap-3 rounded-lg text-sm font-medium transition-colors text-start ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
                {user?.display_name || user?.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-all" dir="ltr">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label={t.nav.signOut}
              title={t.nav.signOut}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Top App Bar (compact 48px to keep aggregate sticky height <= 15%) */}
      <header className="lg:hidden sticky top-0 z-30 h-[48px] px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t.common.more}
            aria-expanded={mobileMenuOpen}
            className="min-h-[44px] min-w-[44px] -ms-1.5 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold truncate">{t.appName}</span>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          tabIndex={-1}
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.navigationMenu}
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="penny-drawer relative z-10 w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-e border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="h-[52px] px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
                <img src="/penny-mark.svg" alt="" className="w-7 h-7 rounded-lg" />
                {t.appName}
              </span>
              <button
                type="button"
                data-dialog-initial-focus
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t.common.close}
                className="min-h-[44px] min-w-[44px] -me-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(currentRoute, item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectNav(item.key)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-3 rounded-lg text-sm font-medium text-start ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    {user?.display_name || user?.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 break-all" dir="ltr">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  aria-label={t.nav.signOut}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-10">
        <div key={currentRoute} className="penny-page max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
          <ErrorAlert error={signOutError} />
          {children}
        </div>
      </main>

      {/* Mobile Bottom Thumb Tab Bar (compact 52px) */}
      <nav
        aria-label={t.nav.mobileNavigation}
        className="penny-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 h-[64px] pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 grid grid-cols-5"
      >
        {MOBILE_PRIMARY_TABS.map((key, index) => {
          const item = navItems.find((navItem) => navItem.key === key)!;
          const Icon = item.icon;
          const active = isRouteActive(currentRoute, key);
          return (
            <React.Fragment key={key}>
              {index === 2 && (
                <button
                  type="button"
                  onClick={onQuickAddTransaction}
                  aria-label={t.nav.newEntry}
                  className="min-h-[44px] w-full px-1 flex flex-col items-center justify-center gap-0.5 text-emerald-700 dark:text-emerald-300 transition-colors hover:text-emerald-800 dark:hover:text-emerald-200"
                >
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shadow-[0_3px_9px_-4px_rgba(5,150,105,0.8)]">
                    <Plus className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] leading-tight font-semibold">{t.nav.newEntry}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSelectNav(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 ${active ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
