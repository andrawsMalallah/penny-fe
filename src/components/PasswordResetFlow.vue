<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, resetPassword } from '../lib/api'
import { copy } from '../lib/copy'
import { useAuthFeedback } from '../lib/useAuthFeedback'
import AuthInput from './AuthInput.vue'
import PrimaryButton from './PrimaryButton.vue'

const emit = defineEmits<{ back: [] }>()
const step = ref<'email' | 'code' | 'password' | 'done'>('email')
const email = ref('')
const code = ref('')
const password = ref('')
const confirmation = ref('')
const busy = ref(false)
const notice = ref(false)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { errorKey, fieldErrors, error, clearErrors, fieldError, focusError, showError } =
  useAuthFeedback(errorSummary)
const title = computed(
  () =>
    ({
      email: copy.value.resetTitle,
      code: copy.value.verifyTitle,
      password: copy.value.newPasswordTitle,
      done: copy.value.resetDoneTitle,
    })[step.value],
)

onMounted(() => heading.value?.focus())

function clearPasswords(): void {
  password.value = ''
  confirmation.value = ''
}

async function moveTo(value: typeof step.value): Promise<void> {
  step.value = value
  clearErrors()
  await nextTick()
  heading.value?.focus()
}

async function submit(resend = false): Promise<void> {
  if (busy.value) return
  clearErrors()
  notice.value = false
  if (step.value === 'password' && password.value !== confirmation.value) {
    fieldErrors.value.confirmation = [copy.value.passwordMismatch]
    errorKey.value = 'validation'
    await focusError()
    return
  }
  busy.value = true
  try {
    if (step.value === 'email' || resend) {
      await apiRequest('auth/password-reset/', { email: email.value.trim() })
      code.value = ''
      clearPasswords()
      await moveTo('code')
      notice.value = true
    } else if (step.value === 'code') {
      await apiRequest('auth/password-reset/verify/', { code: code.value })
      code.value = ''
      await moveTo('password')
    } else if (step.value === 'password') {
      await resetPassword(password.value)
      clearPasswords()
      await moveTo('done')
    }
  } catch (cause) {
    if (cause instanceof ApiError && cause.fields.code && step.value === 'password') {
      clearPasswords()
      step.value = 'code'
    }
    await showError(cause, step.value === 'code' ? 'code' : 'form')
  } finally {
    busy.value = false
  }
}

async function changeEmail(): Promise<void> {
  code.value = ''
  clearPasswords()
  notice.value = false
  await moveTo('email')
}
</script>

<template>
  <div :aria-busy="busy">
    <div class="form-heading">
      <h2 id="form-title" ref="heading" tabindex="-1">{{ title }}</h2>
      <p v-if="step === 'email'">{{ copy.resetSubtitle }}</p>
      <p v-else-if="step === 'code'">
        {{ copy.verifySubtitle }} <bdi class="email-address">{{ email }}</bdi>
      </p>
      <p v-else-if="step === 'password'">{{ copy.resetSessionNote }}</p>
      <p v-else role="status">{{ copy.resetDoneBody }}</p>
    </div>
    <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ error }}
    </div>
    <form v-if="step !== 'done'" @submit.prevent="submit()">
      <AuthInput
        v-if="step === 'email'"
        id="reset-email"
        v-model="email"
        :label="copy.email"
        :error="fieldError('email')"
        type="email"
        direction="ltr"
        autocomplete="email"
        :maxlength="254"
        placeholder="you@example.com"
        :disabled="busy"
      />
      <template v-else-if="step === 'code'">
        <p v-if="notice" class="notice" role="status">{{ copy.resetSent }}</p>
        <AuthInput
          id="reset-code"
          v-model="code"
          :label="copy.code"
          :help="copy.codeHelp"
          :error="fieldError('code')"
          code
          direction="ltr"
          autocomplete="one-time-code"
          :minlength="6"
          :maxlength="6"
          placeholder="000000"
          :disabled="busy"
        />
      </template>
      <template v-else>
        <AuthInput
          id="reset-password"
          v-model="password"
          :label="copy.newPasswordTitle"
          :help="copy.passwordHelp"
          :error="fieldError('password')"
          type="password"
          autocomplete="new-password"
          :minlength="12"
          :maxlength="256"
          :disabled="busy"
        />
        <AuthInput
          id="reset-confirmation"
          v-model="confirmation"
          :label="copy.confirmPassword"
          :error="fieldErrors.confirmation ? copy.passwordMismatch : undefined"
          type="password"
          autocomplete="new-password"
          :minlength="12"
          :maxlength="256"
          :disabled="busy"
        />
      </template>
      <PrimaryButton :busy="busy">{{
        busy
          ? copy.resetWorking
          : step === 'email'
            ? copy.sendResetCode
            : step === 'code'
              ? copy.checkResetCode
              : copy.resetPassword
      }}</PrimaryButton>
      <template v-if="step === 'code'">
        <p class="form-note">{{ copy.resendNote }}</p>
        <div class="secondary-actions">
          <button class="text-button" type="button" :disabled="busy" @click="submit(true)">
            {{ copy.resend }}
          </button>
          <button class="text-button" type="button" :disabled="busy" @click="changeEmail">
            {{ copy.changeEmail }}
          </button>
        </div>
      </template>
    </form>
    <div class="auth-switch">
      <button class="text-button" type="button" :disabled="busy" @click="emit('back')">
        {{ copy.backToSignIn }}
      </button>
    </div>
  </div>
</template>
