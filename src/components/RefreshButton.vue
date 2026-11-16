<script setup lang="ts">
import { copy } from '../lib/copy'
import ControlIcon from './ControlIcon.vue'
defineProps<{ busy?: boolean; iconOnly?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="secondary-button refresh-button"
    :class="{ 'refresh-icon-button': iconOnly }"
    type="button"
    :disabled="busy"
    :aria-label="copy.refreshSessions"
    :title="copy.refreshSessions"
    @click="$emit('click')"
  >
    <ControlIcon name="refresh" /><span v-if="!iconOnly">{{ copy.refreshSessions }}</span>
  </button>
</template>
