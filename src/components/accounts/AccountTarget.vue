<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '../../lib/accounts'
import { targetProgress } from '../../lib/accountTargets'
import { accountCopy as text } from '../../lib/accountCopy'

const props = defineProps<{ balance: string; target: string; currency: 'IQD' | 'USD' }>()
const progress = computed(() => targetProgress(props.balance, props.target))
</script>

<template>
  <div class="account-target" :class="{ 'target-reached': progress.reached }">
    <div class="target-heading">
      <span
        >{{ text.target }} · <bdi>{{ currency }}</bdi></span
      >
      <span class="target-status">{{
        progress.reached ? text.targetReached : `${progress.percent}%`
      }}</span>
    </div>
    <p class="target-amounts">
      <bdi>{{ formatMoney(balance) }}</bdi>
      <span>{{ text.targetOf }}</span>
      <bdi>{{ formatMoney(target) }} {{ currency }}</bdi>
    </p>
    <progress
      :value="progress.percent"
      max="100"
      :aria-label="`${text.target} · ${currency}`"
      :aria-valuetext="`${formatMoney(balance)} ${text.targetOf} ${formatMoney(target)} ${currency}`"
    />
    <p v-if="!progress.reached" class="target-remaining">
      {{ text.targetRemaining }}: <bdi>{{ formatMoney(progress.remaining) }} {{ currency }}</bdi>
    </p>
  </div>
</template>
