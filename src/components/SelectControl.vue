<script setup lang="ts" generic="OptionValue extends string">
import ControlIcon from './ControlIcon.vue'

const model = defineModel<OptionValue>({ required: true })
defineProps<{
  id: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}>()
</script>

<template>
  <div class="select-control">
    <select
      :id="id"
      v-model="model"
      :name="id"
      :disabled="disabled"
      :aria-invalid="invalid"
      :aria-describedby="describedBy"
    >
      <slot />
    </select>
    <ControlIcon name="chevron" class="select-chevron" />
  </div>
</template>
