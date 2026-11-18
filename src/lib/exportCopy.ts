import { computed } from 'vue'
import { language } from './preferences'

const english = {
  title: 'Export CSV',
  help: 'Export every transaction matching your applied Activity filters, across all pages. Unapplied filter changes are not included.',
  count: 'Matching transactions',
  format:
    'One row per Activity entry. Dates use YYYY-MM-DD and amounts keep their original currency. The CSV follows your app language.',
  fresh:
    'The export uses current data at download time. If the count changes, review it again before downloading.',
  precision:
    'For very large amounts, import amount columns as text in your spreadsheet to preserve every digit.',
  download: 'Download CSV',
  downloading: 'Preparing download…',
  changed: 'The transaction count changed. Review the updated count, then download again.',
  ready: 'CSV download started.',
  empty: 'No transactions match these filters. Go back and change or clear the filters.',
}
const arabic: typeof english = {
  title: 'تصدير CSV',
  help: 'صدّر كل الحركات المطابقة لمرشحات الحركات المطبقة، عبر جميع الصفحات. لا تشمل التغييرات غير المطبقة على المرشحات.',
  count: 'الحركات المطابقة',
  format:
    'صف واحد لكل حركة. التاريخ بصيغة YYYY-MM-DD والمبالغ بعملتها الأصلية. يتبع ملف CSV لغة التطبيق.',
  fresh: 'يستخدم التصدير البيانات الحالية وقت التنزيل. إذا تغير العدد، راجعه مجدداً قبل التنزيل.',
  precision:
    'للمبالغ الكبيرة جداً، استورد أعمدة المبالغ كنص في برنامج الجداول للحفاظ على كل الأرقام.',
  download: 'تنزيل CSV',
  downloading: 'جارٍ تجهيز التنزيل…',
  changed: 'تغير عدد الحركات. راجع العدد المحدّث ثم نزّل الملف مجدداً.',
  ready: 'بدأ تنزيل ملف CSV.',
  empty: 'لا توجد حركات مطابقة لهذه المرشحات. ارجع وغيّر المرشحات أو امسحها.',
}
export const exportCopy = computed(() => (language.value === 'ar' ? arabic : english))
