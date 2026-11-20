import { computed } from 'vue'
import { language } from './preferences'

const english = {
  title: 'Monthly review',
  overview: 'Reports',
  intro: 'Review income, spending and budgets for one month, with each currency kept separate.',
  month: 'Month',
  apply: 'Review month',
  refresh: 'Refresh monthly review',
  incomplete:
    'This month is incomplete. Comparison uses the same elapsed calendar dates in the previous month, capped at its last day.',
  completed: 'Completed month. Comparison covers the full previous month.',
  current: 'Selected month',
  previous: 'Previous month',
  change: 'Change',
  income: 'Income',
  expense: 'Spending',
  difference: 'Net cash flow',
  cashHelp:
    'Net cash flow is income minus spending. Openings, transfers, exchanges and debt cash movements are excluded.',
  fresh:
    'Based on current records and budget rules. Later corrections appear when you refresh. Balances carry forward automatically.',
  top: 'Top 5 spending categories',
  noSpending: 'No spending in this currency for this month.',
  budgets: 'Budget progress',
  noBudgets: 'No budgets apply to this month.',
  budgetHelp:
    'Full monthly limits compared with spending through the selected end date. All pages use fresh data.',
  activity: 'View activity',
  empty: 'No income or spending was recorded for these dates.',
  error: 'The monthly review could not be loaded. Try again.',
  invalid: 'Choose this month or a valid past month.',
  loading: 'Loading monthly review…',
  retry: 'Try again',
}
const arabic: typeof english = {
  title: 'المراجعة الشهرية',
  overview: 'التقارير',
  intro: 'راجع الإيرادات والمصروفات والميزانيات لشهر واحد، مع إبقاء كل عملة منفصلة.',
  month: 'الشهر',
  apply: 'مراجعة الشهر',
  refresh: 'تحديث المراجعة الشهرية',
  incomplete:
    'هذا الشهر غير مكتمل. تستخدم المقارنة التواريخ المنقضية نفسها من الشهر السابق، حتى آخر يوم فيه كحد أقصى.',
  completed: 'شهر مكتمل. تشمل المقارنة الشهر السابق كاملاً.',
  current: 'الشهر المحدد',
  previous: 'الشهر السابق',
  change: 'التغير',
  income: 'الإيرادات',
  expense: 'المصروفات',
  difference: 'صافي التدفق النقدي',
  cashHelp:
    'صافي التدفق النقدي هو الإيرادات ناقص المصروفات. لا يشمل الأرصدة الافتتاحية والتحويلات وصرف العملات والحركات النقدية للديون.',
  fresh:
    'استناداً إلى السجلات وقواعد الميزانية الحالية. تظهر التصحيحات اللاحقة عند التحديث. تُرحّل الأرصدة تلقائياً.',
  top: 'أعلى 5 فئات إنفاق',
  noSpending: 'لا توجد مصروفات بهذه العملة لهذا الشهر.',
  budgets: 'تقدم الميزانيات',
  noBudgets: 'لا توجد ميزانيات سارية لهذا الشهر.',
  budgetHelp:
    'حدود الشهر كاملة مقارنة بالمصروفات حتى تاريخ النهاية المحدد. تستخدم كل صفحة بيانات حديثة.',
  activity: 'عرض الحركات',
  empty: 'لم تُسجّل إيرادات أو مصروفات لهذه التواريخ.',
  error: 'تعذّر تحميل المراجعة الشهرية. حاول مجدداً.',
  invalid: 'اختر الشهر الحالي أو شهراً سابقاً صالحاً.',
  loading: 'جارٍ تحميل المراجعة الشهرية…',
  retry: 'حاول مجدداً',
}
export const monthlyReviewCopy = computed(() => (language.value === 'ar' ? arabic : english))
