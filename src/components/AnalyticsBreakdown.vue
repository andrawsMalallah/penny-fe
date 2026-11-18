<script setup lang="ts">
import { computed } from 'vue'
import type { Currency } from '../lib/transactions'
import type { RecordPage } from '../lib/accounts'
import { formatMoney } from '../lib/accounts'
import {
  activityLink,
  reportPercent,
  type AnalyticsReport,
  type BreakdownRow,
  type BreakdownSection,
} from '../lib/analytics'
import { analyticsCopy as text } from '../lib/analyticsCopy'
import { language } from '../lib/preferences'
import PageControls from './PageControls.vue'
import ReportBar from './ReportBar.vue'
const props = defineProps<{
  section: BreakdownSection
  records: RecordPage<BreakdownRow>
  page: number
  busy: boolean
  currency: Currency
  report: AnalyticsReport
}>()
defineEmits<{ change: [page: number] }>()
const title = computed(() => text.value[props.section])
function name(row: BreakdownRow): string {
  if (props.section === 'categories')
    return (
      (language.value === 'ar'
        ? row.category_name_ar || row.category_name_en
        : row.category_name_en || row.category_name_ar) ?? ''
    )
  return row.name ?? row.person_name ?? row.group_name ?? text.value.ungrouped
}
function amount(row: BreakdownRow): string {
  return props.section === 'accounts'
    ? ((props.currency === 'IQD' ? row.balance_iqd : row.balance_usd) ?? '0.00')
    : (row[props.currency] ?? '0.00')
}
function link(row: BreakdownRow): string {
  if (props.section === 'accounts')
    return activityLink({ account: String(row.id), currency: props.currency })
  return activityLink({
    category: String(row.category),
    kind: 'expense',
    currency: props.currency,
    start: props.report.period.start,
    end: props.report.period.end,
  })
}
function personAmount(row: BreakdownRow, direction: 'owed_to_me' | 'i_owe'): string {
  return row[`${direction}_${props.currency}`] ?? '0.00'
}
const total = computed(() =>
  props.section === 'categories'
    ? props.report.activity[props.currency].expense
    : props.report.current[props.currency].held,
)
</script>
<template>
  <section class="surface-panel report-breakdown" :aria-label="title">
    <div class="panel-heading">
      <h2>{{ title }}</h2>
      <bdi class="report-currency">{{ currency }}</bdi>
    </div>
    <p class="field-help">
      {{
        section === 'categories'
          ? `${report.period.start} — ${report.period.end}`
          : text.currentHelp
      }}
    </p>
    <p v-if="!records.count" class="report-empty">
      {{ section === 'categories' ? text.noSpending : text.empty }}
    </p>
    <table v-else class="report-table">
      <caption class="sr-only">
        {{
          title
        }}
        ·
        {{
          currency
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ text.name }}</th>
          <template v-if="section === 'people'"
            ><th scope="col">{{ text.owedToMe }}</th>
            <th scope="col">{{ text.iOwe }}</th></template
          ><template v-else
            ><th scope="col">{{ section === 'categories' ? text.expense : text.balance }}</th>
            <th v-if="section === 'categories'" scope="col">{{ text.share }}</th></template
          >
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in records.results"
          :key="row.id ?? row.category ?? row.person ?? row.group ?? `ungrouped-${index}`"
        >
          <th scope="row">
            <a
              v-if="section === 'accounts' || section === 'categories'"
              :href="link(row)"
              :aria-label="`${text.openActivity}: ${name(row)} · ${currency}`"
              >{{ name(row) }}</a><span v-else>{{ name(row) }}</span>
            <span v-if="row.archived || row.category_archived" class="report-archived">{{
              text.archived
            }}</span>
            <ReportBar
              v-if="section !== 'people'"
              :amount="amount(row)"
              :total="total"
              :spending="section === 'categories'"
            />
            <small
              v-if="
                section === 'accounts' && (currency === 'IQD' ? row.target_iqd : row.target_usd)
              "
              class="report-target"
              >{{ text.target }}:
              <bdi
                >{{ formatMoney((currency === 'IQD' ? row.target_iqd : row.target_usd)!) }}
                {{ currency }}</bdi
              ></small
            >
          </th>
          <template v-if="section === 'people'"
            ><td>
              <bdi>{{ formatMoney(personAmount(row, 'owed_to_me')) }}</bdi>
            </td>
            <td>
              <bdi>{{ formatMoney(personAmount(row, 'i_owe')) }}</bdi>
            </td></template
          >
          <template v-else
            ><td>
              <bdi>{{ formatMoney(amount(row)) }}</bdi>
            </td>
            <td v-if="section === 'categories'">
              <bdi>{{ reportPercent(amount(row), total) }}%</bdi>
            </td></template
          >
        </tr>
      </tbody>
    </table>
    <PageControls
      :page="page"
      :next="!!records.next"
      :previous="!!records.previous"
      :busy="busy"
      @change="$emit('change', $event)"
    />
  </section>
</template>
