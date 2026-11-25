import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { transactionsApi, type TransactionFilterQuery } from '../../api/endpoints';
import type { LanguageCode } from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../../components/ui/Modal';
import { ErrorAlert } from '../../components/ui/ErrorAlert';

interface ExportCsvModalProps {
  open: boolean;
  onClose: () => void;
  filters: TransactionFilterQuery;
}

export function ExportCsvModal({ open, onClose, filters }: ExportCsvModalProps) {
  const { t, language, format } = useI18n();
  const [exportLang, setExportLang] = useState<LanguageCode>(language);
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setExportLang(language);
    setCount(null);
    setError(null);
    setLoadingCount(true);
    transactionsApi
      .getExportCount(filters)
      .then((res) => setCount(res.count))
      .catch((err) => setError(err))
      .finally(() => setLoadingCount(false));
  }, [open, filters, language]);

  const handleDownload = async () => {
    if (count === null) return;
    setError(null);
    setDownloading(true);
    try {
      const url = transactionsApi.buildExportUrl(filters, exportLang, count);
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        let msg = `Export failed (${res.status}).`;
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const payload = (await res.json()) as { detail?: string; error?: string };
            msg = payload.detail || payload.error || msg;
          }
        } catch {
          // Keep default error message
        }
        throw new Error(msg);
      }

      if (!res.headers.get('content-type')?.startsWith('text/csv')) {
        throw new Error('The server did not return a CSV file.');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `penny-activity-${exportLang}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={downloading ? () => {} : onClose}
      title={t.activity.exportConfirmTitle}
      size="sm"
      footer={
        <>
          <button
            type="button"
            disabled={downloading}
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={loadingCount || downloading || count === null || count === 0}
            onClick={() => void handleDownload()}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? t.common.loading : t.activity.downloadCsv}</span>
          </button>
        </>
      }
    >
      <ErrorAlert error={error} />

      {loadingCount ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.common.loading}</p>
      ) : count !== null ? (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {format(t.activity.exportCountPrompt, {
            count,
            lang: exportLang === 'ar' ? t.common.ar : t.common.en,
          })}
        </p>
      ) : null}

      <div>
        <span className="block text-sm font-medium mb-1.5">{t.activity.exportLanguage}</span>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          {(['en', 'ar'] as LanguageCode[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setExportLang(lang)}
              className={`min-h-[36px] rounded-md text-sm font-medium transition-colors ${
                exportLang === lang
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.common[lang]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
