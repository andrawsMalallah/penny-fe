<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '../../lib/accounts'
import { activityLink, cents } from '../../lib/analytics'
import type { MonthlyReview } from '../../lib/monthlyReview'
import type { Currency } from '../../lib/transactions'
import { categoryName } from '../../lib/categories'
import { language } from '../../lib/preferences'
import { monthlyReviewCopy as text } from '../../lib/monthlyReviewCopy'
import ReportBar from './ReportBar.vue'

const props = defineProps<{ report: MonthlyReview; currency: Currency }>()
const totals = computed(() => props.report.activity[props.currency])
const metrics = computed(
  () =>
    [
      {
        key: 'income',
        value: totals.value.income,
        previous: totals.value.previous_income,
        change: totals.value.income_change,
      },
      {
        key: 'expense',
        value: totals.value.expense,
        previous: totals.value.previous_expense,
        change: totals.value.expense_change,
      },
      {
        key: 'difference',
        value: totals.value.difference,
        previous: totals.value.previous_difference,
        change: totals.value.difference_change,
      },
    ] as const,
)
function activity(category?: number, kind?: 'income' | 'expense'): string {
  return activityLink({
    category: category === undefined ? '' : String(category),
    kind,
    currency: props.currency,
    start: props.report.period.start,
    end: props.report.period.end,
  })
}
</script>

<template>
  <article class="surface-panel monthly-currency" :aria-label="currency">
    <h3 class="report-currency">{{ currency }}</h3>
    <p v-if="cents(totals.income) === 0n && cents(totals.expense) === 0n" class="field-help">
      {{ text.empty }}
    </p>
    <section v-for="metric in metrics" :key="metric.key" class="monthly-metric">
      <h4>{{ text[metric.key] }}</h4>
      <dl>
        <div>
          <dt>{{ text.current }}</dt>
          <dd>
            <bdi>{{ formatMoney(metric.value) }} {{ currency }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ text.previous }}</dt>
          <dd>
            <bdi>{{ formatMoney(metric.previous) }} {{ currency }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ text.change }}</dt>
          <dd>
            <bdi>{{ formatMoney(metric.change) }} {{ currency }}</bdi>
          </dd>
        </div>
      </dl>
      <a v-if="metric.key !== 'difference'" :href="activity(undefined, metric.key)">{{
        text.activity
      }}</a>
    </section>
    <h4>{{ text.top }}</h4>
    <p v-if="!report.top_categories[currency].length" class="field-help">{{ text.noSpending }}</p>
    <ol v-else class="monthly-categories">
      <li v-for="row in report.top_categories[currency]" :key="row.category">
        <a :href="activity(row.category, 'expense')">{{
          categoryName({ name_en: row.category_name_en!, name_ar: row.category_name_ar! }, language)
        }}</a>
        <bdi>{{ formatMoney(row[currency]!) }} {{ currency }}</bdi>
        <ReportBar :amount="row[currency]!" :total="totals.expense" spending />
      </li>
    </ol>
  </article>
</template>
