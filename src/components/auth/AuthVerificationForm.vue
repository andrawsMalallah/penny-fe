<script setup lang="ts">
import { copy } from '../../lib/copy'
import AuthInput from './AuthInput.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

defineProps<{ busy: boolean; notice: boolean; error?: string }>()
defineEmits<{ verify: []; resend: []; changeEmail: [] }>()
const code = defineModel<string>({ required: true })
</script>

<template>
  <form @submit.prevent="$emit('verify')">
    <AuthInput
      id="code"
      v-model="code"
      :label="copy.code"
      :help="copy.codeHelp"
      :error="error"
      code
      direction="ltr"
      autocomplete="one-time-code"
      :minlength="6"
      :maxlength="6"
      placeholder="000000"
      :disabled="busy"
    />
    <PrimaryButton :busy="busy">{{ busy ? copy.verifying : copy.verify }}</PrimaryButton>
    <p class="form-note">{{ copy.resendNote }}</p>
    <div class="secondary-actions">
      <button class="text-button" type="button" :disabled="busy" @click="$emit('resend')">
        {{ copy.resend }}
      </button>
      <button class="text-button" type="button" :disabled="busy" @click="$emit('changeEmail')">
        {{ copy.changeEmail }}
      </button>
    </div>
    <p v-if="notice" class="notice" role="status">{{ copy.resendSuccess }}</p>
  </form>
</template>
