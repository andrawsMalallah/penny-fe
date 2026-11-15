<script setup lang="ts">
defineProps<{ id: string; label: string; error?: string; help?: string }>()
</script>
<template>
  <div class="form-field">
    <label :for="id">{{ label }}</label>
    <slot :described-by="error || help ? `${id}-description` : undefined" :invalid="!!error" />
    <p v-if="error || help" :id="`${id}-description`" :class="error ? 'field-error' : 'field-help'">
      {{ error || help }}
    </p>
  </div>
</template>
