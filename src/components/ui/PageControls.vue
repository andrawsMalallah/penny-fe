<script setup lang="ts">
import { accountCopy as text } from '../../lib/accountCopy'
defineProps<{ page: number; next: boolean; previous: boolean; busy: boolean }>()
defineEmits<{ change: [page: number] }>()
</script>
<template>
  <div v-if="next || previous" class="page-controls" :aria-label="text.page">
    <button
      type="button"
      class="secondary-button"
      :disabled="busy || !previous"
      @click="$emit('change', page - 1)"
    >
      {{ text.previous }}
    </button>
    <span aria-live="polite">{{ text.page }} {{ page }}</span>
    <button
      type="button"
      class="secondary-button"
      :disabled="busy || !next"
      @click="$emit('change', page + 1)"
    >
      {{ text.next }}
    </button>
  </div>
</template>
