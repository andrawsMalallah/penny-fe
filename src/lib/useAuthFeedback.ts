import { computed, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { ApiError } from './api'
import { copy } from './copy'
import { language } from './preferences'

type AuthErrorKey =
  | 'rateLimit'
  | 'loginRateLimit'
  | 'invalidCredentials'
  | 'unavailable'
  | 'sessionsUnavailable'
  | 'sessionError'
  | 'invalidCode'
  | 'validation'
  | 'connection'
  | 'factorInvalid'
  | 'factorRateLimit'
  | 'factorUnavailable'
  | 'factorExpired'
type ErrorContext = 'login' | 'code' | 'form' | 'sessions' | 'factor'

export function useAuthFeedback(errorSummary: Ref<HTMLElement | null>) {
  const errorKey = ref<AuthErrorKey | ''>('')
  const fieldErrors = ref<Record<string, string[]>>({})
  const error = computed(() => (errorKey.value ? copy.value[errorKey.value] : ''))

  function clearErrors(): void {
    errorKey.value = ''
    fieldErrors.value = {}
  }

  function fieldError(field: string): string | undefined {
    const messages = fieldErrors.value[field]
    return messages?.length
      ? language.value === 'ar'
        ? copy.value.validation
        : messages[0]
      : undefined
  }

  async function focusError(): Promise<void> {
    await nextTick()
    errorSummary.value?.focus()
  }

  async function showError(cause: unknown, context: ErrorContext = 'form'): Promise<void> {
    fieldErrors.value = cause instanceof ApiError ? cause.fields : {}
    if (!(cause instanceof ApiError)) errorKey.value = 'connection'
    else if (cause.status === 429)
      errorKey.value =
        context === 'factor'
          ? 'factorRateLimit'
          : context === 'login'
            ? 'loginRateLimit'
            : 'rateLimit'
    else if (cause.status === 401) errorKey.value = 'invalidCredentials'
    else if (cause.status === 503)
      errorKey.value =
        context === 'factor'
          ? 'factorUnavailable'
          : context === 'sessions'
            ? 'sessionsUnavailable'
            : 'unavailable'
    else if (cause.status === 403) errorKey.value = 'sessionError'
    else if (cause.status === 400)
      errorKey.value =
        context === 'factor' && cause.fields.otp
          ? 'factorInvalid'
          : context === 'code' || cause.fields.code
            ? 'invalidCode'
            : 'validation'
    else errorKey.value = 'connection'
    await focusError()
  }

  return {
    errorKey,
    fieldErrors,
    error,
    clearErrors,
    fieldError,
    focusError,
    showError,
  }
}
