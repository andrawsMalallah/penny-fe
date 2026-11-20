<script setup lang="ts">
import { copy } from '../../lib/copy'
import ControlIcon from './ControlIcon.vue'
defineProps<{ disabled?: boolean; label?: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="secondary-button back-button"
    type="button"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <ControlIcon name="back" /><span>{{ label ?? copy.backToWorkspace }}</span>
  </button>
</template>
