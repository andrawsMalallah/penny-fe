<script setup lang="ts">
import { copy } from '../lib/copy'
import ControlIcon from './ControlIcon.vue'
defineProps<{ busy?: boolean; iconOnly?: boolean; label?: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="secondary-button refresh-button"
    :class="{ 'refresh-icon-button': iconOnly }"
    type="button"
    :disabled="busy"
    :aria-label="label ?? copy.refreshSessions"
    :title="label ?? copy.refreshSessions"
    @click="$emit('click')"
  >
    <ControlIcon name="refresh" /><span v-if="!iconOnly">{{ label ?? copy.refreshSessions }}</span>
  </button>
</template>
