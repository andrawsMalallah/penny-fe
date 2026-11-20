<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref } from 'vue'
import { ApiError } from '../../lib/api'
import { getActivityCsv, getExportCount, saveActivityCsv } from '../../lib/activityExport'
import { accountCopy } from '../../lib/accountCopy'
import { exportCopy as text } from '../../lib/exportCopy'
import { language } from '../../lib/preferences'
import type { ActivityFilters } from '../../lib/transactions'
import PrimaryButton from '../ui/PrimaryButton.vue'

const props = defineProps<{ filters: ActivityFilters }>()
const emit = defineEmits<{ error: [cause: unknown]; clear: [] }>()
// Capture applied filters once; drafts and later route changes cannot alter this review.
const filters = { ...props.filters }
const count = ref<number | null>(null)
const busy = ref(false)
const changed = ref(false)
const downloaded = ref(false)
const heading = ref<HTMLElement | null>(null)
const controller = new AbortController()
let disposed = false

async function review(): Promise<void> {
  emit('clear')
  busy.value = true
  count.value = null
  try {
    const result = await getExportCount(filters)
    if (!disposed) count.value = result.count
  } catch (cause) {
    if (!disposed) emit('error', cause)
  } finally {
    busy.value = false
  }
}
async function download(): Promise<void> {
  if (busy.value || !count.value) return
  emit('clear')
  busy.value = true
  changed.value = false
  downloaded.value = false
  const selectedLanguage = language.value
  try {
    const document = await getActivityCsv(filters, selectedLanguage, count.value, controller.signal)
    if (disposed) return
    saveActivityCsv(document, selectedLanguage)
    downloaded.value = true
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ApiError && cause.status === 409) {
      changed.value = true
      await review()
      await nextTick()
      heading.value?.focus()
    } else emit('error', cause)
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  heading.value?.focus()
  await review()
})
onScopeDispose(() => {
  disposed = true
  controller.abort()
})
</script>

<template>
  <section
    class="transaction-confirmation surface-panel"
    :aria-busy="busy"
    aria-labelledby="activity-export-title"
  >
    <h2 id="activity-export-title" ref="heading" tabindex="-1">{{ text.title }}</h2>
    <p>{{ text.help }}</p>
    <p v-if="count !== null" class="confirmation-name">
      {{ text.count }}: <bdi>{{ count }}</bdi>
    </p>
    <p v-if="changed" class="notice" role="alert">{{ text.changed }}</p>
    <p v-if="downloaded" class="notice" role="status">{{ text.ready }}</p>
    <p v-if="count === 0">{{ text.empty }}</p>
    <p>{{ text.format }}</p>
    <p class="field-help">{{ text.fresh }}</p>
    <p class="field-help">{{ text.precision }}</p>
    <p v-if="busy" role="status">{{ count === null ? accountCopy.loading : text.downloading }}</p>
    <div class="form-actions">
      <PrimaryButton
        v-if="count !== null"
        type="button"
        :busy="busy"
        :disabled="!count"
        @click="download"
        >{{ text.download }}</PrimaryButton
      >
      <button v-else type="button" class="secondary-button" :disabled="busy" @click="review">
        {{ accountCopy.retry }}
      </button>
    </div>
  </section>
</template>
