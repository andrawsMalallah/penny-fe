export interface User {
  id: number
  email: string
  display_name: string
  email_verified: boolean
  language: 'en' | 'ar'
  timezone: string
}

export type LoginResult = User | { two_factor_required: true }

export interface SessionState {
  user: User | null
  two_factor_pending: boolean
}

export function getSessionState(): Promise<SessionState> {
  return apiRequest<SessionState>('auth/session/')
}

export interface UserSettings {
  default_account: number | null
  language: 'en' | 'ar'
  default_currency: '' | 'IQD' | 'USD'
  exchange_rate: string | null
}

export async function signOut(): Promise<void> {
  await apiRequest<void>('auth/logout/', {})
  csrfToken = ''
}

export interface FactorStatus {
  enabled: boolean
  recovery_remaining: number
}

export interface FactorSetup {
  secret: string
  qr_code: string
}

export interface RecoveryCodes {
  recovery_codes: string[]
}

export interface SignedInSession {
  browser: string
  device: string
  signed_in_at: string | null
  last_active_at: string
  is_current: boolean
}

export interface SessionPage {
  count: number
  next: string | null
  previous: string | null
  results: SignedInSession[]
}

export function getSessions(page = 1): Promise<SessionPage> {
  return apiRequest<SessionPage>(`auth/sessions/?page=${page}`)
}

export async function signOutAll(): Promise<void> {
  await apiRequest<void>('auth/logout-all/', {})
  csrfToken = ''
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public fields: Record<string, string[]>,
  ) {
    super('The request could not be completed.')
  }
}

let csrfToken = ''

async function initializeSession(): Promise<void> {
  const response = await fetch('/api/v1/auth/csrf/', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) throw new ApiError(response.status, {})
  const payload = (await response.json()) as { csrf_token: string }
  csrfToken = payload.csrf_token
}

function safeFields(payload: unknown): Record<string, string[]> {
  if (!payload || typeof payload !== 'object') return {}
  const fields: Record<string, string[]> = {}
  // Only structured validation fields are surfaced. Raw server responses never reach the UI.
  for (const field of [
    'email',
    'display_name',
    'password',
    'code',
    'otp',
    'timezone',
    'language',
    'default_currency',
    'exchange_rate',
    'default_account',
    'name',
    'name_en',
    'name_ar',
    'account',
    'person',
    'person_name',
    'direction',
    'origin',
    'destination',
    'category',
    'kind',
    'currency',
    'amount',
    'received_amount',
    'date',
    'note',
    'start',
    'end',
    'group',
    'opening_iqd',
    'opening_usd',
    'target_iqd',
    'target_usd',
    'target_version',
    'month',
    'scope',
    'version',
    'limit_iqd',
    'limit_usd',
    'frequency',
    'start_date',
    'end_date',
    'scheduled_date',
    'state',
  ]) {
    const messages = (payload as Record<string, unknown>)[field]
    if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
      fields[field] = messages
    }
  }
  return fields
}

export async function apiRequest<T>(path: string, body?: unknown): Promise<T> {
  if (body !== undefined && !csrfToken) await initializeSession()
  const response = await fetch(`/api/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    // Refresh CSRF for the next user action; never replay a mutation automatically.
    if (response.status === 403) csrfToken = ''
    throw new ApiError(response.status, safeFields(payload))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function verifyEmail(code: string): Promise<User> {
  const user = await apiRequest<User>('auth/verify-email/', { code })
  // Django rotates CSRF on login. Fetch a fresh token before subsequent writes.
  csrfToken = ''
  return user
}

export async function signIn(email: string, password: string): Promise<LoginResult> {
  const user = await apiRequest<LoginResult>('auth/login/', { email, password })
  csrfToken = ''
  return user
}

export async function verifySecondFactor(otp: string, recovery: boolean): Promise<User> {
  const user = await apiRequest<User>('auth/2fa/login/', { otp, recovery })
  csrfToken = ''
  return user
}

export async function factorMutation<T>(
  path: 'enable' | 'disable' | 'recovery-codes',
  body: unknown,
): Promise<T> {
  const result = await apiRequest<T>(`auth/2fa/${path}/`, body)
  csrfToken = ''
  return result
}

export async function resetPassword(password: string): Promise<void> {
  await apiRequest<void>('auth/password-reset/complete/', { password })
  // Recovery flushes the browser session. The next sign-in needs a fresh token.
  csrfToken = ''
}
