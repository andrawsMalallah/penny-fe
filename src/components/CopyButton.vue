<script setup lang="ts">
import { ref, watch } from 'vue'
import { copyElementText } from '../lib/clipboard'
import { copy } from '../lib/copy'

const props = defineProps<{ text: string; label: string; disabled?: boolean }>()
const textElement = ref<HTMLElement | null>(null)
const copying = ref(false)
const state = ref<'idle' | 'copied' | 'failed'>('idle')
watch(
  () => props.text,
  () => {
    state.value = 'idle'
  },
)

async function copyText(): Promise<void> {
  if (!textElement.value || copying.value || props.disabled) return
  copying.value = true
  state.value = 'idle'
  try {
    state.value = (await copyElementText(textElement.value)) ? 'copied' : 'failed'
  } catch {
    state.value = 'failed'
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <span class="copy-control">
    <button
      class="copy-icon-button"
      type="button"
      :aria-label="label"
      :title="label"
      :disabled="disabled || copying || !text"
      @click="copyText"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path v-if="state === 'copied'" d="m5 12 4 4L19 6" />
        <template v-else>
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </template>
      </svg>
    </button>
    <span ref="textElement" class="sr-only copy-text" aria-hidden="true">{{ text }}</span>
    <span v-if="state !== 'idle'" class="copy-feedback" role="status">{{
      state === 'copied' ? copy.textCopied : copy.textCopyFailed
    }}</span>
  </span>
</template>

<style scoped>
.copy-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  vertical-align: middle;
}
.copy-icon-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
}
.copy-icon-button:hover {
  background: var(--secondary);
}
.copy-feedback {
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.copy-text {
  white-space: pre;
}
</style>
