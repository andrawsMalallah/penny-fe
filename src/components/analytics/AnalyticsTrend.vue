<script setup lang="ts">
import { computed } from 'vue'
import type { Currency } from '../../lib/transactions'
import { cents, monthLabel, reportPercent, type TrendMonth } from '../../lib/analytics'
import { analyticsCopy as text } from '../../lib/analyticsCopy'
import { language } from '../../lib/preferences'
import { formatMoney } from '../../lib/accounts'
const props = defineProps<{ months: TrendMonth[]; currency: Currency }>()
const maximum = computed(() =>
  props.months
    .flatMap((month) => [month[props.currency].income, month[props.currency].expense])
    .reduce((highest, amount) => (cents(amount) > cents(highest) ? amount : highest), '0.00'),
)
function barHeight(amount: string): number {
  return reportPercent(amount, maximum.value) * 1.3
}
</script>
<template>
  <div class="trend-legend">
    <span class="income-legend">{{ text.income }}</span><span class="spending-legend">{{
      text.expense
    }}</span
    ><bdi>{{ currency }}</bdi>
  </div>
  <svg class="trend-chart" viewBox="0 0 600 145" aria-hidden="true" focusable="false">
    <line x1="0" y1="140" x2="600" y2="140" />
    <g v-for="(month, index) in months" :key="month.month">
      <rect
        class="trend-income"
        :x="index * 100 + 24"
        :y="140 - barHeight(month[currency].income)"
        width="22"
        :height="barHeight(month[currency].income)"
        rx="3"
      />
      <rect
        class="trend-spending"
        :x="index * 100 + 50"
        :y="140 - barHeight(month[currency].expense)"
        width="22"
        :height="barHeight(month[currency].expense)"
        rx="3"
      />
    </g>
  </svg>
  <div class="trend-month-labels" dir="ltr" aria-hidden="true">
    <bdi v-for="month in months" :key="month.month">{{ monthLabel(month.month, language) }}</bdi>
  </div>
  <details class="report-exact-values">
    <summary>{{ text.exactValues }} · {{ currency }}</summary>
    <table class="report-table">
      <caption class="sr-only">
        {{
          text.trends
        }}
        ·
        {{
          currency
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ text.month }}</th>
          <th scope="col">{{ text.income }}</th>
          <th scope="col">{{ text.expense }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="month in months" :key="month.month">
          <th scope="row">{{ monthLabel(month.month, language) }}</th>
          <td>
            <bdi>{{ formatMoney(month[currency].income) }}</bdi>
          </td>
          <td>
            <bdi>{{ formatMoney(month[currency].expense) }}</bdi>
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>
