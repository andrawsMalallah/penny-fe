<script setup lang="ts">
import { computed } from 'vue'
import type { BudgetMoney } from '../lib/budgets'
import { reportPercent, cents } from '../lib/analytics'
import { formatMoney } from '../lib/accounts'
import { budgetCopy as text } from '../lib/budgetCopy'
const props = defineProps<{ money: BudgetMoney; currency: 'IQD' | 'USD' }>()
const percent = computed(() => reportPercent(props.money.spent, props.money.limit!))
const status = computed(() =>
  props.money.over
    ? text.value.over
    : cents(props.money.remaining!) === 0n
      ? text.value.reached
      : text.value.within,
)
</script>
<template>
  <section
    v-if="money.limit"
    class="budget-progress"
    :class="{ 'budget-over': money.over }"
    :aria-label="currency"
  >
    <div class="budget-progress-heading">
      <strong>{{ currency }}</strong><span>{{ status }}</span>
    </div>
    <p class="budget-spending">
      <bdi>{{ formatMoney(money.spent) }}</bdi><span
        >/ <bdi>{{ formatMoney(money.limit) }} {{ currency }}</bdi></span
      >
    </p>
    <progress
      :value="percent"
      max="100"
      :aria-label="`${text.spent} ${currency}`"
      :aria-valuetext="`${text.spent}: ${formatMoney(money.spent)} / ${formatMoney(money.limit)} ${currency}`"
    />
    <p>
      {{ money.over ? text.over : text.remaining }}:
      <bdi>{{ formatMoney(money.remaining!.replace(/^-/, '')) }} {{ currency }}</bdi>
    </p>
    <slot />
  </section>
</template>
