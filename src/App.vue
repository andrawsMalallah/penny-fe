<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AuthShowcase from './components/AuthShowcase.vue'
import FormField from './components/FormField.vue'
import PrimaryButton from './components/PrimaryButton.vue'
import { ApiError, apiRequest, signIn, verifyEmail } from './lib/api'
import type { User } from './lib/api'
import { copy } from './lib/copy'
import { appearance, initializePreferences, language } from './lib/preferences'

initializePreferences()
const stage = ref<'login' | 'register' | 'verify' | 'welcome'>('login')
const loading = ref(true)
const busy = ref(false)
const displayName = ref('')
const email = ref('')
const password = ref('')
const code = ref('')
const user = ref<User | null>(null)
type ErrorKey =
  | 'rateLimit'
  | 'loginRateLimit'
  | 'invalidCredentials'
  | 'unavailable'
  | 'sessionError'
  | 'invalidCode'
  | 'validation'
  | 'connection'
const errorKey = ref<ErrorKey | ''>('')
const error = computed(() => (errorKey.value ? copy.value[errorKey.value] : ''))
const notice = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})
const errorSummary = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)

function rememberEmail(value: string): void {
  try {
    if (value) sessionStorage.setItem('penny.pending-email', value)
    else sessionStorage.removeItem('penny.pending-email')
  } catch {
    /* Browser storage is optional. Never store passwords or tokens here. */
  }
}
function fieldError(field: string): string | undefined {
  const messages = fieldErrors.value[field]
  return messages?.length
    ? language.value === 'ar'
      ? copy.value.validation
      : messages[0]
    : undefined
}
async function showError(cause: unknown): Promise<void> {
  if (cause instanceof ApiError) {
    fieldErrors.value = cause.fields
    errorKey.value =
      cause.status === 429
        ? stage.value === 'login'
          ? 'loginRateLimit'
          : 'rateLimit'
        : cause.status === 401
          ? 'invalidCredentials'
          : cause.status === 503
            ? 'unavailable'
            : cause.status === 403
              ? 'sessionError'
              : cause.status === 400 && stage.value === 'verify'
                ? 'invalidCode'
                : cause.status === 400
                  ? 'validation'
                  : 'connection'
  } else errorKey.value = 'connection'
  await nextTick()
  errorSummary.value?.focus()
}
async function changeStage(value: typeof stage.value): Promise<void> {
  stage.value = value
  errorKey.value = ''
  notice.value = false
  fieldErrors.value = {}
  await nextTick()
  heading.value?.focus()
}
async function register(): Promise<void> {
  if (busy.value) return
  busy.value = true
  errorKey.value = ''
  fieldErrors.value = {}
  try {
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
  } catch (cause) {
    await showError(cause)
  } finally {
    busy.value = false
  }
}
async function submitCredentials(): Promise<void> {
  if (stage.value === 'register') {
    await register()
    return
  }
  if (busy.value) return
  busy.value = true
  errorKey.value = ''
  fieldErrors.value = {}
  try {
    user.value = await signIn(email.value.trim(), password.value)
    password.value = ''
    rememberEmail('')
    language.value = user.value.language
    await changeStage('welcome')
  } catch (cause) {
    await showError(cause)
  } finally {
    busy.value = false
  }
}
async function switchCredentials(): Promise<void> {
  password.value = ''
  rememberEmail('')
  await changeStage(stage.value === 'login' ? 'register' : 'login')
}
async function verify(): Promise<void> {
  if (busy.value) return
  busy.value = true
  errorKey.value = ''
  fieldErrors.value = {}
  try {
    user.value = await verifyEmail(code.value)
    code.value = ''
    rememberEmail('')
    await changeStage('welcome')
  } catch (cause) {
    await showError(cause)
  } finally {
    busy.value = false
  }
}
async function resend(): Promise<void> {
  if (busy.value) return
  busy.value = true
  errorKey.value = ''
  notice.value = false
  try {
    await apiRequest('auth/resend-code/', {})
    code.value = ''
    notice.value = true
  } catch (cause) {
    await showError(cause)
  } finally {
    busy.value = false
  }
}
async function signOut(): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    await apiRequest('auth/logout/', {})
    user.value = null
    rememberEmail('')
    await changeStage('login')
  } catch (cause) {
    await showError(cause)
  } finally {
    busy.value = false
  }
}
async function useDifferentEmail(): Promise<void> {
  rememberEmail('')
  code.value = ''
  await changeStage('register')
}
onMounted(async () => {
  try {
    user.value = await apiRequest<User>('auth/me/')
    stage.value = 'welcome'
    language.value = user.value.language
  } catch (cause) {
    if (!(cause instanceof ApiError && cause.status === 403)) errorKey.value = 'connection'
    try {
      const pendingEmail = sessionStorage.getItem('penny.pending-email')
      if (pendingEmail) {
        email.value = pendingEmail
        stage.value = 'verify'
      }
    } catch {
      /* Storage is optional. */
    }
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <a class="skip-link" href="#main">{{
    language === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'
  }}</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Penny"
      ><img src="/logo.svg" width="34" height="34" alt="" /><span>Penny</span></a
    >
    <div class="header-controls">
      <button
        class="language-button"
        type="button"
        :lang="language === 'en' ? 'ar' : 'en'"
        @click="language = language === 'en' ? 'ar' : 'en'"
      >
        {{ language === 'en' ? 'العربية' : 'English' }}
      </button>
      <label class="appearance-control"
        ><span class="sr-only">{{ copy.appearance }}</span
        ><select v-model="appearance">
          <option value="system">{{ copy.system }}</option>
          <option value="light">{{ copy.light }}</option>
          <option value="dark">{{ copy.dark }}</option>
        </select></label
      >
    </div>
  </header>
  <main id="main" class="auth-layout">
    <AuthShowcase />
    <section class="auth-panel" :aria-busy="busy || loading" aria-labelledby="form-title">
      <p v-if="loading" role="status">{{ copy.loading }}</p>
      <template v-else>
        <div class="form-heading">
          <h2 id="form-title" ref="heading" tabindex="-1">
            {{
              stage === 'register'
                ? copy.registerTitle
                : stage === 'login'
                  ? copy.loginTitle
                  : stage === 'verify'
                    ? copy.verifyTitle
                    : copy.successTitle
            }}
          </h2>
          <p v-if="stage === 'register'">{{ copy.registerSubtitle }}</p>
          <p v-else-if="stage === 'login'">{{ copy.loginSubtitle }}</p>
          <p v-else-if="stage === 'verify'">
            {{ copy.verifySubtitle }} <bdi class="email-address">{{ email }}</bdi>
          </p>
          <p v-else>{{ copy.successBody }}</p>
        </div>
        <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
          {{ error }}
        </div>
        <form v-if="stage === 'register' || stage === 'login'" @submit.prevent="submitCredentials">
          <FormField
            v-if="stage === 'register'"
            id="name"
            :label="copy.name"
            :error="fieldError('display_name')"
            ><template #default="{ describedBy, invalid }"
              ><input
                id="name"
                v-model="displayName"
                name="name"
                autocomplete="name"
                maxlength="100"
                required
                :placeholder="copy.namePlaceholder"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                :disabled="busy" /></template
          ></FormField>
          <FormField id="email" :label="copy.email" :error="fieldError('email')"
            ><template #default="{ describedBy, invalid }"
              ><input
                id="email"
                v-model="email"
                dir="ltr"
                name="email"
                type="email"
                autocomplete="email"
                maxlength="254"
                required
                placeholder="you@example.com"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                :disabled="busy" /></template
          ></FormField>
          <FormField
            id="password"
            :label="copy.password"
            :help="stage === 'register' ? copy.passwordHelp : undefined"
            :error="fieldError('password')"
            ><template #default="{ describedBy, invalid }"
              ><input
                id="password"
                v-model="password"
                name="password"
                type="password"
                :autocomplete="stage === 'register' ? 'new-password' : 'current-password'"
                :minlength="stage === 'register' ? 12 : 1"
                maxlength="256"
                required
                :placeholder="stage === 'register' ? copy.passwordPlaceholder : copy.loginPassword"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                :disabled="busy" /></template
          ></FormField>
          <PrimaryButton :busy="busy">{{
            stage === 'login'
              ? busy
                ? copy.signingIn
                : copy.signIn
              : busy
                ? copy.creating
                : copy.create
          }}</PrimaryButton>
          <p v-if="stage === 'register'" class="form-note">{{ copy.emailNote }}</p>
          <div class="auth-switch">
            <span>{{ stage === 'login' ? copy.needAccount : copy.haveAccount }}</span><button
              class="text-button"
              type="button"
              :disabled="busy"
              @click="switchCredentials"
            >
              {{ stage === 'login' ? copy.create : copy.signIn }}
            </button>
          </div>
        </form>
        <form v-else-if="stage === 'verify'" @submit.prevent="verify">
          <FormField id="code" :label="copy.code" :help="copy.codeHelp" :error="fieldError('code')"
            ><template #default="{ describedBy, invalid }"
              ><input
                id="code"
                v-model="code"
                class="code-input"
                dir="ltr"
                name="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{6}"
                minlength="6"
                maxlength="6"
                required
                placeholder="000000"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                :disabled="busy" /></template
          ></FormField>
          <PrimaryButton :busy="busy">{{ busy ? copy.verifying : copy.verify }}</PrimaryButton>
          <p class="form-note">{{ copy.resendNote }}</p>
          <div class="secondary-actions">
            <button class="text-button" type="button" :disabled="busy" @click="resend">
              {{ copy.resend }}</button><button
              class="text-button"
              type="button"
              :disabled="busy"
              @click="useDifferentEmail"
            >
              {{ copy.changeEmail }}
            </button>
          </div>
          <p v-if="notice" class="notice" role="status">{{ copy.resendSuccess }}</p>
        </form>
        <div v-else class="welcome-panel">
          <div class="verified-identity">
            <span class="verified-mark" aria-hidden="true">✓</span>
            <div>
              <strong>{{ user?.display_name }}</strong><bdi>{{ user?.email }}</bdi>
            </div>
          </div>
          <p>{{ copy.foundationNote }}</p>
          <PrimaryButton type="button" :busy="busy" @click="signOut">{{
            copy.logout
          }}</PrimaryButton>
        </div>
        <p class="privacy-note">{{ copy.privacyNote }}</p>
      </template>
    </section>
  </main>
</template>
