<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError, apiRequest, verifySecondFactor } from '../lib/api'
import type { User } from '../lib/api'
import { copy } from '../lib/copy'
import { useAuthFeedback } from '../lib/useAuthFeedback'
import FactorCodeInput from './FactorCodeInput.vue'
import PrimaryButton from './PrimaryButton.vue'

const emit = defineEmits<{ authenticated: [user: User]; back: [] }>()
const code = ref('')
const recovery = ref(false)
const busy = ref(false)
const expired = ref(false)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, clearErrors, showError } = useAuthFeedback(errorSummary)
onMounted(() => heading.value?.focus())

async function submit(): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    const user = await verifySecondFactor(code.value, recovery.value)
    code.value = ''
    emit('authenticated', user)
  } catch (cause) {
    code.value = ''
    await showError(cause, 'factor')
    if (cause instanceof ApiError && cause.status === 400) {
      try {
        const state = await apiRequest<{ pending: boolean }>('auth/2fa/login/')
        expired.value = !state.pending
      } catch {
        /* Keep the existing actionable error if the status check fails. */
      }
    }
  } finally {
    busy.value = false
  }
}

async function cancel(): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    await apiRequest('auth/2fa/login/cancel/', {})
    code.value = ''
    emit('back')
  } catch (cause) {
    await showError(cause, 'factor')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div :aria-busy="busy">
    <div class="form-heading">
      <h2 id="form-title" ref="heading" tabindex="-1">{{ copy.factorLoginTitle }}</h2>
      <p>{{ copy.factorLoginBody }}</p>
    </div>
    <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ expired ? copy.factorExpired : error }}
    </div>
    <form v-if="!expired" @submit.prevent="submit">
      <FactorCodeInput
        id="login-factor-code"
        v-model="code"
        v-model:recovery="recovery"
        :busy="busy"
        allow-recovery
      />
      <PrimaryButton :busy="busy">{{ copy.factorVerify }}</PrimaryButton>
    </form>
    <button class="text-button" type="button" :disabled="busy" @click="cancel">
      {{ copy.backToSignIn }}
    </button>
  </div>
</template>
