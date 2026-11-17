import { computed } from 'vue'
import { language } from './preferences'

const english = {
  title: 'Expense categories',
  intro: 'Organize your spending with categories you can make your own.',
  add: 'Add category',
  edit: 'Edit category',
  englishName: 'English name',
  arabicName: 'Arabic name',
  nameHelp:
    'Enter at least one name. Add both to display a translated name when switching languages.',
  validation:
    'Check the names. Enter at least one, with no duplicate names, including archived categories.',
  archiveTitle: 'Archive this category?',
  archiveHelp: 'It will no longer be available for new expenses. Its name and history are kept.',
  restoreTitle: 'Restore this category?',
  restoreHelp: 'It will be available for new expenses again.',
  empty: 'No active categories',
  emptyHelp: 'Add a category or restore one from Archived.',
  noArchived: 'No archived categories',
  noArchivedHelp: 'Categories you archive will appear here.',
  archivedNotice: 'Category archived.',
  restoredNotice: 'Category restored.',
  refresh: 'Refresh categories',
}
const arabic: typeof english = {
  title: 'فئات المصروفات',
  intro: 'نظّم مصروفاتك بفئات يمكنك تعديلها حسب احتياجاتك.',
  add: 'إضافة فئة',
  edit: 'تعديل الفئة',
  englishName: 'الاسم بالإنجليزية',
  arabicName: 'الاسم بالعربية',
  nameHelp: 'أدخل اسماً واحداً على الأقل. أضف الاسمين لعرض الترجمة عند تغيير اللغة.',
  validation: 'تحقق من الأسماء. أدخل اسماً واحداً على الأقل دون تكرار، بما في ذلك الفئات المؤرشفة.',
  archiveTitle: 'أرشفة هذه الفئة؟',
  archiveHelp: 'لن تكون متاحة للمصروفات الجديدة. يُحفظ اسمها وسجلها.',
  restoreTitle: 'استعادة هذه الفئة؟',
  restoreHelp: 'ستكون متاحة للمصروفات الجديدة مجدداً.',
  empty: 'لا توجد فئات نشطة',
  emptyHelp: 'أضف فئة أو استعد فئة من الأرشيف.',
  noArchived: 'لا توجد فئات مؤرشفة',
  noArchivedHelp: 'ستظهر هنا الفئات التي تؤرشفها.',
  archivedNotice: 'تمت أرشفة الفئة.',
  restoredNotice: 'تمت استعادة الفئة.',
  refresh: 'تحديث الفئات',
}
export const categoryCopy = computed(() => (language.value === 'ar' ? arabic : english))
