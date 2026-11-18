<script setup lang="ts">
import { computed } from 'vue'
import { reportPercent } from '../lib/analytics'
const props = defineProps<{ amount: string; total: string; spending?: boolean }>()
const width = computed(() => reportPercent(props.amount, props.total))
</script>
<template>
  <svg
    class="report-bar"
    :class="{ 'report-bar-spending': spending }"
    viewBox="0 0 100 6"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect class="report-bar-track" width="100" height="6" rx="3" />
    <rect :width="width" height="6" rx="3" />
  </svg>
</template>
