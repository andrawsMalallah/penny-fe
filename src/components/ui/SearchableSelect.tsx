import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PaginatedResponse } from '../../api/types';
import { useI18n } from '../../i18n/useI18n';

interface Props<T extends { id: number }> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  loadPage: (page: number) => Promise<PaginatedResponse<T>>;
  getById?: (id: number) => Promise<T>;
  getLabel: (option: T) => string;
  getSearchText?: (option: T) => string;
  emptyLabel?: string;
  required?: boolean;
  excludedId?: number;
  className?: string;
}

export async function loadAllChoices<T>(loadPage: (page: number) => Promise<PaginatedResponse<T>>): Promise<T[]> {
  const choices: T[] = [];
  let page = 1;
  while (true) {
    const response = await loadPage(page);
    choices.push(...response.results);
    if (!response.next) return choices;
    page += 1;
  }
}

export function filterChoices<T>(choices: T[], getLabel: (choice: T) => string, search: string, getSearchText = getLabel): T[] {
  const term = search.trim().toLocaleLowerCase();
  return term ? choices.filter((choice) => getSearchText(choice).toLocaleLowerCase().includes(term)) : choices;
}

export function SearchableSelect<T extends { id: number }>({
  id, label, value, onChange, loadPage, getById, getLabel, getSearchText,
  emptyLabel, required, excludedId, className = '',
}: Props<T>) {
  const { t } = useI18n();
  const loadPageRef = useRef(loadPage);
  const getByIdRef = useRef(getById);
  loadPageRef.current = loadPage;
  getByIdRef.current = getById;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [choices, setChoices] = useState<T[]>([]);
  const [selectedOption, setSelectedOption] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [listHeight, setListHeight] = useState(176);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    loadAllChoices((page) => loadPageRef.current(page))
      .then((rows) => { if (active) setChoices(rows); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!value || choices.some((option) => String(option.id) === value) || !getByIdRef.current) return;
    let active = true;
    getByIdRef.current(Number(value))
      .then((option) => { if (active) setSelectedOption(option); })
      .catch(() => { if (active) setSelectedOption(null); });
    return () => { active = false; };
  }, [value, choices]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const availableChoices = choices.filter((option) => option.id !== excludedId);
  if (selectedOption && String(selectedOption.id) === value &&
      selectedOption.id !== excludedId && !availableChoices.some((option) => option.id === selectedOption.id)) {
    availableChoices.unshift(selectedOption);
  }
  const visibleChoices = filterChoices(availableChoices, getLabel, search, getSearchText);
  const selected = choices.find((option) => String(option.id) === value) ??
    (selectedOption && String(selectedOption.id) === value ? selectedOption : null);
  const closeAndFocus = () => { setOpen(false); triggerRef.current?.focus(); };
  const openMenu = () => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const scrollArea = rootRef.current?.closest('.penny-dialog')?.querySelector<HTMLElement>('.overflow-y-auto');
    const boundary = scrollArea?.getBoundingClientRect();
    if (trigger) {
      const below = (boundary?.bottom ?? window.innerHeight) - trigger.bottom;
      const above = trigger.top - (boundary?.top ?? 0);
      const flip = below < 250 && above > below;
      setOpenAbove(flip);
      setListHeight(Math.max(56, Math.min(176, (flip ? above : below) - 72)));
    }
    setOpen(true);
    setSearch('');
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  return (
    <div ref={rootRef} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={triggerRef} id={id} type="button" aria-haspopup="listbox"
        aria-expanded={open} aria-controls={`${id}-options`} aria-required={required || undefined}
        onClick={() => { if (open) closeAndFocus(); else openMenu(); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) { event.stopPropagation(); closeAndFocus(); }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-start inline-flex items-center justify-between gap-2 ${className}`}>
        <span className="truncate">{selected ? getLabel(selected) : emptyLabel ?? `${t.common.select} ${label}`}</span>
        <ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-500" />
      </button>
      {open && <div className={`absolute z-30 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg p-2 ${openAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
        <div className="relative mb-2">
          <input ref={searchRef} type="text" autoComplete="off" maxLength={100}
            aria-label={`${t.common.search} ${label}`} value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAndFocus(); }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                document.getElementById(`${id}-options`)?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
              }
            }}
            placeholder={t.common.search}
            className="w-full min-h-[44px] ps-3 pe-11 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
          {search && <button type="button" aria-label={`${t.common.clear} ${t.common.search}`}
            onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute end-1 top-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X aria-hidden="true" className="w-4 h-4" />
          </button>}
        </div>
        <div id={`${id}-options`} role="listbox" aria-label={label} style={{ maxHeight: listHeight }} className="overflow-y-auto"
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAndFocus(); return; }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
            const current = options.indexOf(event.target as HTMLButtonElement);
            const target = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
              event.key === 'ArrowDown' ? Math.min(current + 1, options.length - 1) : Math.max(current - 1, 0);
            if (options[target]) { event.preventDefault(); options[target].focus(); }
          }}>
          {!required && <button type="button" role="option" aria-selected={!value}
            onClick={() => { onChange(''); closeAndFocus(); }}
            className="block w-full min-h-[40px] px-3 py-2 rounded-md text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">
            {emptyLabel ?? t.common.all}
          </button>}
          {loading && <p className="px-3 py-2 text-xs text-slate-500">{t.common.loading}</p>}
          {loadError && <p role="alert" className="px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {t.common.selectLoadFailed}{' '}
            <button type="button" onClick={() => setRetry((current) => current + 1)} className="underline">{t.common.retry}</button>
          </p>}
          {!loading && !loadError && visibleChoices.map((option) => (
            <button key={option.id} type="button" role="option" aria-selected={String(option.id) === value}
              onClick={() => { onChange(String(option.id)); closeAndFocus(); }}
              className="block w-full min-h-[40px] px-3 py-2 rounded-md text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">
              {getLabel(option)}
            </button>
          ))}
          {!loading && !loadError && visibleChoices.length === 0 && <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{t.common.noData}</p>}
        </div>
      </div>}
    </div>
  );
}
