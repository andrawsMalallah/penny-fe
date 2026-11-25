import { formatMoney, type CurrencyCode } from '../../utils/money';
import { useI18n } from '../../i18n/useI18n';

interface CurrencyAmountProps {
  amount: string | null | undefined;
  currency: CurrencyCode;
  showSign?: boolean;
  tone?: 'neutral' | 'positive' | 'negative' | 'info';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<CurrencyAmountProps['tone']>, string> = {
  neutral: 'text-slate-900 dark:text-slate-100',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
  info: 'text-blue-700 dark:text-blue-400',
};

export function CurrencyAmount({
  amount,
  currency,
  showSign = false,
  tone = 'neutral',
  className = '',
}: CurrencyAmountProps) {
  const { language } = useI18n();
  const formatted = formatMoney(amount, currency, language, { showSign });

  return (
    <span
      dir="ltr"
      className={`font-mono-num tabular-nums whitespace-nowrap inline-block ${TONE_CLASSES[tone]} ${className}`}
    >
      {formatted}
    </span>
  );
}
