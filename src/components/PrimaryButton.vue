<script setup lang="ts">
withDefaults(defineProps<{ busy?: boolean; type?: 'submit' | 'button' }>(), { type: 'submit' })
</script>
<template>
  <button class="primary-button" :type="type" :disabled="busy" :aria-busy="busy || undefined">
    <slot /><span v-if="busy" class="spinner" aria-hidden="true"></span>
  </button>
</template>
