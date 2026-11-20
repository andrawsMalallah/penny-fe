<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { ApiError } from '../../lib/api'
import { formatMoney } from '../../lib/accounts'
import {
  getAnalytics,
  getBreakdown,
  type AnalyticsReport,
  type BreakdownSection,
  type ReportFilters,
} from '../../lib/analytics'
import { analyticsCopy as text } from '../../lib/analyticsCopy'
import { dateLabel, localDate, type Currency } from '../../lib/transactions'
import { language } from '../../lib/preferences'
import FormField from '../ui/FormField.vue'
import SelectControl from '../ui/SelectControl.vue'
import RefreshButton from '../ui/RefreshButton.vue'
import AnalyticsTrend from './AnalyticsTrend.vue'
import AnalyticsBreakdown from './AnalyticsBreakdown.vue'
import { monthlyReviewCopy } from '../../lib/monthlyReviewCopy'

const MonthlyReviewPanel = defineAsyncComponent(() => import('./MonthlyReviewPanel.vue'))
const monthly = ref(false)
async function changeSection(value: boolean): Promise<void> {
  if (busy.value || monthly.value === value) return
  monthly.value = value
  report.value = null
  if (!value) await load()
}

const emit = defineEmits<{ expired: [] }>()
const filters = ref<ReportFilters>({ period: 'this_month', start: localDate(), end: localDate() })
const applied = ref({ ...filters.value })
const lastAttempt = ref({ ...filters.value })
const report = ref<AnalyticsReport | null>(null)
const currency = ref<Currency>('IQD')
const busy = ref(false)
const failure = ref<'error' | 'invalid' | ''>('')
const invalidFields = ref<Record<string, string[]>>({})
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const pages = ref<Record<BreakdownSection, number>>({
  accounts: 1,
  groups: 1,
  categories: 1,
  people: 1,
})
const activity = computed(() => report.value?.activity[currency.value])
const dateRange = computed(() =>
  report.value
    ? `${dateLabel(report.value.period.start, language.value)} — ${dateLabel(report.value.period.end, language.value)}`
    : '',
)
const comparisonRange = computed(() =>
  report.value
    ? `${dateLabel(report.value.period.previous_start, language.value)} — ${dateLabel(report.value.period.previous_end, language.value)}`
    : '',
)
async function handleError(cause: unknown): Promise<void> {
  if (cause instanceof ApiError && cause.status === 403) {
    emit('expired')
    return
  }
  invalidFields.value = cause instanceof ApiError ? cause.fields : {}
  failure.value = cause instanceof ApiError && cause.status === 400 ? 'invalid' : 'error'
  await nextTick()
  errorSummary.value?.focus()
}
async function load(source: 'applied' | 'draft' | 'retry' = 'applied'): Promise<void> {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  invalidFields.value = {}
  report.value = null
  const requested = {
    ...(source === 'retry'
      ? lastAttempt.value
      : source === 'draft'
        ? filters.value
        : applied.value),
  }
  lastAttempt.value = { ...requested }
  try {
    const result = await getAnalytics(requested)
    report.value = result
    applied.value = requested
    pages.value = { accounts: 1, groups: 1, categories: 1, people: 1 }
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function changePage(section: BreakdownSection, page: number): Promise<void> {
  if (busy.value || !report.value) return
  busy.value = true
  failure.value = ''
  try {
    const result = await getBreakdown(section, applied.value, page)
    report.value.breakdowns[section] = result
    pages.value[section] = page
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  heading.value?.focus()
  await load()
})
</script>
<template>
  <section class="analytics-page" :aria-busy="busy" :aria-label="text.title">
    <div class="page-heading analytics-heading">
      <div>
        <h1 ref="heading" tabindex="-1">{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton v-if="!monthly" :label="text.refresh" :busy="busy" icon-only @click="load()" />
    </div>
    <div class="activity-sections" role="group" :aria-label="text.title">
      <button
        id="show-reports"
        type="button"
        class="secondary-button"
        :aria-pressed="!monthly"
        :disabled="busy"
        @click="changeSection(false)"
      >
        {{ monthlyReviewCopy.overview }}
      </button>
      <button
        id="show-monthly-review"
        type="button"
        class="secondary-button"
        :aria-pressed="monthly"
        :disabled="busy"
        @click="changeSection(true)"
      >
        {{ monthlyReviewCopy.title }}
      </button>
    </div>
    <MonthlyReviewPanel v-if="monthly" @expired="emit('expired')" />
    <template v-else>
      <div v-if="failure" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
        {{ text[failure] }}
        <button
          type="button"
          class="text-button"
          :disabled="busy"
          @click="load(failure === 'invalid' ? 'draft' : 'retry')"
        >
          {{ text.retry }}
        </button>
      </div>
      <p v-if="busy" role="status">{{ text.loading }}</p>
      <section v-if="report" class="current-position" :aria-label="text.current">
        <div class="panel-heading">
          <div>
            <h2>{{ text.current }}</h2>
            <p>{{ text.asOfNow }} · {{ text.allAccounts }}</p>
          </div>
        </div>
        <div class="position-currencies">
          <div
            v-for="unit in ['IQD', 'USD'] as const"
            :key="unit"
            class="surface-panel position-currency"
          >
            <h3 class="report-currency">{{ unit }}</h3>
            <dl>
              <div
                class="position-held"
                :class="{ 'position-held-long': report.current[unit].held.length > 18 }"
              >
                <dt>{{ text.held }}</dt>
                <dd>
                  <bdi>{{ formatMoney(report.current[unit].held) }}</bdi>
                </dd>
              </div>
              <div>
                <dt>{{ text.owedToMe }}</dt>
                <dd>
                  <bdi>{{ formatMoney(report.current[unit].owed_to_me) }}</bdi>
                </dd>
              </div>
              <div>
                <dt>{{ text.iOwe }}</dt>
                <dd>
                  <bdi>{{ formatMoney(report.current[unit].i_owe) }}</bdi>
                </dd>
              </div>
              <div class="position-net">
                <dt>{{ text.net }}</dt>
                <dd>
                  <bdi>{{ formatMoney(report.current[unit].net) }}</bdi>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <p class="field-help">{{ text.netHelp }}</p>
      </section>
      <form class="surface-panel report-filters" @submit.prevent="load('draft')">
        <div class="report-filter-fields">
          <FormField id="report-period" :label="text.period"
            ><SelectControl id="report-period" v-model="filters.period" :disabled="busy"
              ><option
                v-for="period in ['this_month', 'previous_month', 'this_year', 'custom'] as const"
                :key="period"
                :value="period"
              >
                {{ text[period] }}
              </option></SelectControl
            ></FormField
          >
          <FormField id="report-currency" :label="text.currency"
            ><SelectControl id="report-currency" v-model="currency"
              ><option value="IQD">IQD</option>
              <option value="USD">USD</option></SelectControl
            ></FormField
          >
          <template v-if="filters.period === 'custom'">
            <FormField
              id="report-start"
              :label="text.start"
              :error="invalidFields.start ? text.invalid : undefined"
              ><input
                id="report-start"
                v-model="filters.start"
                type="date"
                dir="ltr"
                required
                :disabled="busy"
                :max="localDate()"
                :aria-invalid="!!invalidFields.start"
                :aria-describedby="invalidFields.start ? 'report-start-description' : undefined"
            /></FormField>
            <FormField
              id="report-end"
              :label="text.end"
              :error="invalidFields.end ? text.invalid : undefined"
              ><input
                id="report-end"
                v-model="filters.end"
                type="date"
                dir="ltr"
                required
                :disabled="busy"
                :min="filters.start"
                :max="localDate()"
                :aria-invalid="!!invalidFields.end"
                :aria-describedby="invalidFields.end ? 'report-end-description' : undefined"
            /></FormField>
          </template>
        </div>
        <button type="submit" class="secondary-button" :disabled="busy">{{ text.apply }}</button>
      </form>
      <template v-if="report && activity">
        <section class="surface-panel period-report" :aria-label="text.periodActivity">
          <div class="panel-heading">
            <div>
              <h2>{{ text.periodActivity }}</h2>
              <p>{{ dateRange }}</p>
            </div>
            <bdi class="report-currency">{{ currency }}</bdi>
          </div>
          <dl class="activity-totals">
            <div>
              <dt>{{ text.income }}</dt>
              <dd>
                <bdi>{{ formatMoney(activity.income) }}</bdi>
              </dd>
            </div>
            <div>
              <dt>{{ text.expense }}</dt>
              <dd>
                <bdi>{{ formatMoney(activity.expense) }}</bdi>
              </dd>
            </div>
            <div>
              <dt>{{ text.difference }}</dt>
              <dd>
                <bdi>{{ formatMoney(activity.difference) }}</bdi>
              </dd>
            </div>
          </dl>
          <p class="field-help">{{ text.exclusions }}</p>
          <details class="report-exact-values">
            <summary>{{ text.comparison }} {{ comparisonRange }}</summary>
            <table class="report-table">
              <caption class="sr-only">
                {{
                  text.comparison
                }}
                ·
                {{
                  currency
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ text.periodActivity }}</th>
                  <th scope="col">{{ text.previous }}</th>
                  <th scope="col">{{ text.change }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{{ text.income }}</th>
                  <td>
                    <bdi>{{ formatMoney(activity.previous_income) }}</bdi>
                  </td>
                  <td>
                    <bdi>{{ formatMoney(activity.income_change) }}</bdi>
                  </td>
                </tr>
                <tr>
                  <th scope="row">{{ text.expense }}</th>
                  <td>
                    <bdi>{{ formatMoney(activity.previous_expense) }}</bdi>
                  </td>
                  <td>
                    <bdi>{{ formatMoney(activity.expense_change) }}</bdi>
                  </td>
                </tr>
              </tbody>
            </table>
          </details>
        </section>
        <section class="surface-panel" :aria-label="text.trends">
          <div class="panel-heading">
            <div>
              <h2>{{ text.trends }}</h2>
              <p>{{ text.trendsHelp }}</p>
            </div>
          </div>
          <AnalyticsTrend :months="report.trends" :currency="currency" />
        </section>
        <div class="analytics-breakdowns">
          <AnalyticsBreakdown
            v-for="section in ['categories', 'accounts', 'groups', 'people'] as const"
            :key="section"
            :section="section"
            :records="report.breakdowns[section]"
            :page="pages[section]"
            :busy="busy"
            :currency="currency"
            :report="report"
            @change="changePage(section, $event)"
          />
        </div>
      </template>
    </template>
  </section>
</template>
