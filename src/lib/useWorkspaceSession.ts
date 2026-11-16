import { ref } from 'vue'
import type { Ref } from 'vue'
import { ApiError, apiRequest, signOut, type User } from './api'
import { useAuthFeedback } from './useAuthFeedback'

export function useWorkspaceSession(errorSummary: Ref<HTMLElement | null>, home: () => void) {
  const user = ref<User | null>(null)
  const busy = ref(false)
  const signedOutEverywhere = ref(false)
  const { error, errorKey, clearErrors, showError } = useAuthFeedback(errorSummary)

  function authenticated(value: User): void {
    user.value = value
    signedOutEverywhere.value = false
    clearErrors()
  }

  function finishSession(everywhere = false, expired = false): void {
    user.value = null
    signedOutEverywhere.value = everywhere
    clearErrors()
    if (expired) errorKey.value = 'sessionError'
    home()
  }

  function updateLanguage(value: 'en' | 'ar'): void {
    if (user.value) user.value.language = value
  }

  async function logout(): Promise<void> {
    if (busy.value) return
    busy.value = true
    clearErrors()
    try {
      await signOut()
      finishSession()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) {
        try {
          await apiRequest('auth/me/')
        } catch (checkError) {
          if (checkError instanceof ApiError && checkError.status === 403) {
            finishSession(false, true)
            return
          }
        }
      }
      await showError(cause)
    } finally {
      busy.value = false
    }
  }

  return {
    user,
    busy,
    signedOutEverywhere,
    error,
    authenticated,
    finishSession,
    updateLanguage,
    logout,
  }
}
