<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { apiRequest, getSessionState, signIn, verifyEmail } from '../lib/api'
import type { User } from '../lib/api'
import { copy } from '../lib/copy'
import { language } from '../lib/preferences'
import { useAuthFeedback } from '../lib/useAuthFeedback'
import AuthCredentialsForm from './AuthCredentialsForm.vue'
import AuthVerificationForm from './AuthVerificationForm.vue'

const PasswordResetFlow = defineAsyncComponent(() => import('./PasswordResetFlow.vue'))
const SecondFactorForm = defineAsyncComponent(() => import('./SecondFactorForm.vue'))
const emit = defineEmits<{ authenticated: [user: User] }>()
type AuthStage = 'login' | 'register' | 'verify' | 'reset' | 'factor'
const stage = ref<AuthStage>('login')
const loading = ref(true)
const busy = ref(false)
const displayName = ref('')
const email = ref('')
const password = ref('')
const code = ref('')
const notice = ref(false)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { errorKey, error, clearErrors, fieldError, showError } = useAuthFeedback(errorSummary)
const title = computed(
  () =>
    ({
      login: copy.value.loginTitle,
      register: copy.value.registerTitle,
      verify: copy.value.verifyTitle,
      reset: copy.value.resetTitle,
      factor: copy.value.factorLoginTitle,
    })[stage.value],
)

function rememberEmail(value: string): void {
  try {
    if (value) sessionStorage.setItem('penny.pending-email', value)
    else sessionStorage.removeItem('penny.pending-email')
  } catch {
    // Browser storage is optional. Never store passwords or tokens here.
  }
}

async function changeStage(value: AuthStage): Promise<void> {
  stage.value = value
  clearErrors()
  notice.value = false
  await nextTick()
  heading.value?.focus()
}

async function runAction(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  notice.value = false
  try {
    await action()
  } catch (cause) {
    await showError(
      cause,
      stage.value === 'login' ? 'login' : stage.value === 'verify' ? 'code' : 'form',
    )
  } finally {
    busy.value = false
  }
}

async function submitCredentials(): Promise<void> {
  await runAction(async () => {
    if (stage.value === 'register') {
      await apiRequest('auth/register/', {
        display_name: displayName.value.trim(),
        email: email.value.trim(),
        password: password.value,
        language: language.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      password.value = ''
      rememberEmail(email.value.trim())
      await changeStage('verify')
    } else {
      const result = await signIn(email.value.trim(), password.value)
      password.value = ''
      rememberEmail('')
      if ('two_factor_required' in result) {
        await changeStage('factor')
      } else {
        await authenticated(result)
      }
    }
  })
}

async function authenticated(value: User): Promise<void> {
  language.value = value.language
  emit('authenticated', value)
}

async function switchCredentials(): Promise<void> {
  password.value = ''
  rememberEmail('')
  await changeStage(stage.value === 'login' ? 'register' : 'login')
}

async function openPasswordReset(): Promise<void> {
  password.value = ''
  code.value = ''
  rememberEmail('')
  await changeStage('reset')
}

async function verify(): Promise<void> {
  await runAction(async () => {
    const verifiedUser = await verifyEmail(code.value)
    code.value = ''
    rememberEmail('')
    await authenticated(verifiedUser)
  })
}

async function resend(): Promise<void> {
  await runAction(async () => {
    await apiRequest('auth/resend-code/', {})
    code.value = ''
    notice.value = true
  })
}

async function useDifferentEmail(): Promise<void> {
  rememberEmail('')
  code.value = ''
  await changeStage('register')
}

function restorePendingEmail(): void {
  try {
    const pendingEmail = sessionStorage.getItem('penny.pending-email')
    if (pendingEmail) {
      email.value = pendingEmail
      stage.value = 'verify'
    }
  } catch {
    // Registration can continue without optional browser storage.
  }
}

onMounted(async () => {
  try {
    const state = await getSessionState()
    if (state.user) await authenticated(state.user)
    else if (state.two_factor_pending) stage.value = 'factor'
    else restorePendingEmail()
  } catch {
    errorKey.value = 'connection'
    restorePendingEmail()
  } finally {
    loading.value = false
    await nextTick()
    heading.value?.focus()
  }
})
</script>

<template>
  <section class="auth-panel" :aria-busy="busy || loading" aria-labelledby="form-title">
    <p v-if="loading" id="form-title" role="status">{{ copy.loading }}</p>
    <template v-else>
      <PasswordResetFlow v-if="stage === 'reset'" @back="changeStage('login')" />
      <SecondFactorForm
        v-else-if="stage === 'factor'"
        @authenticated="authenticated"
        @back="changeStage('login')"
      />
      <template v-else>
        <div class="form-heading">
          <h2 id="form-title" ref="heading" tabindex="-1">{{ title }}</h2>
          <p v-if="stage === 'register'">{{ copy.registerSubtitle }}</p>
          <p v-else-if="stage === 'login'">{{ copy.loginSubtitle }}</p>
          <p v-else-if="stage === 'verify'">
            {{ copy.verifySubtitle }} <bdi class="email-address">{{ email }}</bdi>
          </p>
        </div>
        <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
          {{ error }}
        </div>
        <AuthCredentialsForm
          v-if="stage === 'register' || stage === 'login'"
          v-model:display-name="displayName"
          v-model:email="email"
          v-model:password="password"
          :registering="stage === 'register'"
          :busy="busy"
          :field-error="fieldError"
          @submit="submitCredentials"
          @switch="switchCredentials"
          @reset="openPasswordReset"
        />
        <AuthVerificationForm
          v-else-if="stage === 'verify'"
          v-model="code"
          :busy="busy"
          :notice="notice"
          :error="fieldError('code')"
          @verify="verify"
          @resend="resend"
          @change-email="useDifferentEmail"
        />
      </template>
    </template>
  </section>
</template>
