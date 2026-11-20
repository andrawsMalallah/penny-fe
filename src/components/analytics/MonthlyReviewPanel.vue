<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref } from 'vue'
import { ApiError, apiRequest } from '../../lib/api'
import { getMonthlyReview, type MonthlyReview } from '../../lib/monthlyReview'
import { monthlyReviewCopy as text } from '../../lib/monthlyReviewCopy'
import { categoryName } from '../../lib/categories'
import { language } from '../../lib/preferences'
import { activityLink, monthLabel } from '../../lib/analytics'
import { dateLabel, localDate, type Currency } from '../../lib/transactions'
import type { BudgetRow } from '../../lib/budgets'
import FormField from '../ui/FormField.vue'
import RefreshButton from '../ui/RefreshButton.vue'
import PageControls from '../ui/PageControls.vue'
import BudgetProgress from '../budgets/BudgetProgress.vue'
import MonthlyCurrencyReview from './MonthlyCurrencyReview.vue'

const emit = defineEmits<{ expired: [] }>()
const month = ref(localDate().slice(0, 7))
const applied = ref(month.value)
const attempted = ref(month.value)
const attemptedPage = ref(1)
const page = ref(1)
const report = ref<MonthlyReview | null>(null)
const busy = ref(false)
const failure = ref<'error' | 'invalid' | ''>('')
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
let disposed = false

async function load(selected = applied.value, selectedPage = 1): Promise<void> {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  report.value = null
  attempted.value = selected
  attemptedPage.value = selectedPage
  try {
    const result = await getMonthlyReview(selected, selectedPage)
    if (disposed) return
    report.value = result
    applied.value = selected
    page.value = selectedPage
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ApiError && cause.status === 403) {
      try {
        await apiRequest('auth/me/')
      } catch (check) {
        if (!disposed && check instanceof ApiError && check.status === 403) {
          emit('expired')
          return
        }
      }
    }
    if (disposed) return
    failure.value = cause instanceof ApiError && cause.status === 400 ? 'invalid' : 'error'
    await nextTick()
    errorSummary.value?.focus()
  } finally {
    busy.value = false
  }
}
function budgetLink(row: BudgetRow, currency: Currency): string {
  return activityLink({
    category: String(row.category),
    kind: 'expense',
    currency,
    start: report.value!.period.start,
    end: report.value!.period.end,
  })
}
onMounted(async () => {
  heading.value?.focus()
  await load()
})
onScopeDispose(() => {
  disposed = true
})
</script>

<template>
  <section class="monthly-review" :aria-busy="busy" aria-labelledby="monthly-review-title">
    <div class="panel-heading">
      <div>
        <h2 id="monthly-review-title" ref="heading" tabindex="-1">{{ text.title }}</h2>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton :label="text.refresh" :busy="busy" icon-only @click="load()" />
    </div>
    <form class="surface-panel budget-toolbar" @submit.prevent="load(month)">
      <FormField
        id="review-month"
        :label="text.month"
        :error="failure === 'invalid' ? text.invalid : undefined"
      >
        <input
          id="review-month"
          v-model="month"
          type="month"
          min="0001-02"
          :max="localDate().slice(0, 7)"
          required
          :disabled="busy"
          :aria-invalid="failure === 'invalid'"
          :aria-describedby="failure === 'invalid' ? 'review-month-description' : undefined"
        />
      </FormField>
      <button type="submit" class="secondary-button" :disabled="busy">{{ text.apply }}</button>
    </form>
    <div v-if="failure" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ text[failure] }}
      <button
        type="button"
        class="text-button"
        :disabled="busy"
        @click="
          load(failure === 'invalid' ? month : attempted, failure === 'invalid' ? 1 : attemptedPage)
        "
      >
        {{ text.retry }}
      </button>
    </div>
    <p v-if="busy" role="status">{{ text.loading }}</p>
    <template v-if="report">
      <section class="surface-panel monthly-period">
        <h3>{{ monthLabel(report.period.month, language) }}</h3>
        <p>
          {{ text.current }}: {{ dateLabel(report.period.start, language) }} —
          {{ dateLabel(report.period.end, language) }}
        </p>
        <p>
          {{ text.previous }}: {{ dateLabel(report.period.previous_start, language) }} —
          {{ dateLabel(report.period.previous_end, language) }}
        </p>
        <p class="notice">{{ report.period.incomplete ? text.incomplete : text.completed }}</p>
        <p class="field-help">{{ text.cashHelp }}</p>
        <p class="field-help">{{ text.fresh }}</p>
      </section>
      <div class="position-currencies">
        <MonthlyCurrencyReview
          v-for="currency in ['IQD', 'USD'] as const"
          :key="currency"
          :report="report"
          :currency="currency"
        />
      </div>
      <section class="monthly-budgets" :aria-label="text.budgets">
        <h3>{{ text.budgets }}</h3>
        <p class="field-help">{{ text.budgetHelp }}</p>
        <p v-if="!report.budgets.count" class="surface-panel">{{ text.noBudgets }}</p>
        <div class="budget-list">
          <article
            v-for="row in report.budgets.results"
            :key="row.category"
            class="surface-panel budget-card"
          >
            <h4>{{ categoryName(row, language) }}</h4>
            <div class="budget-currencies">
              <template v-for="currency in ['IQD', 'USD'] as const" :key="currency">
                <BudgetProgress
                  v-if="row[currency].limit"
                  :money="row[currency]"
                  :currency="currency"
                  ><a :href="budgetLink(row, currency)">{{ text.activity }}</a></BudgetProgress
                >
              </template>
            </div>
          </article>
        </div>
        <PageControls
          :page="page"
          :next="!!report.budgets.next"
          :previous="!!report.budgets.previous"
          :busy="busy"
          @change="load(applied, $event)"
        />
      </section>
    </template>
  </section>
</template>
