<script setup lang="ts">
import FormField from './FormField.vue'
import { ref } from 'vue'
import { designCopy } from '../lib/designCopy'
import ControlIcon from './ControlIcon.vue'
const revealed = ref(false)

const model = defineModel<string>({ required: true })
defineProps<{
  id: string
  label: string
  error?: string
  help?: string
  type?: 'text' | 'email' | 'password'
  autocomplete?: string
  minlength?: number
  maxlength?: number
  placeholder?: string
  disabled?: boolean
  code?: boolean
  direction?: 'ltr' | 'rtl'
}>()
</script>

<template>
  <FormField :id="id" :label="label" :help="help" :error="error">
    <template #default="{ describedBy, invalid }">
      <div class="input-control" :class="{ 'password-control': type === 'password' }">
        <input
          :id="id"
          v-model="model"
          :name="id"
          :type="type === 'password' && revealed ? 'text' : (type ?? 'text')"
          :class="{ 'code-input': code }"
          :dir="direction"
          :autocomplete="autocomplete"
          :minlength="minlength"
          :maxlength="maxlength"
          :pattern="code ? '[0-9]{6}' : undefined"
          :inputmode="code ? 'numeric' : undefined"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-invalid="invalid"
          :aria-describedby="describedBy"
          required
        />
        <button
          v-if="type === 'password'"
          class="password-reveal"
          type="button"
          :disabled="disabled"
          :aria-label="revealed ? designCopy.hidePassword : designCopy.showPassword"
          :aria-pressed="revealed"
          :aria-controls="id"
          @click="revealed = !revealed"
        >
          <ControlIcon :name="revealed ? 'eyeOff' : 'eye'" />
        </button>
      </div>
    </template>
  </FormField>
</template>
