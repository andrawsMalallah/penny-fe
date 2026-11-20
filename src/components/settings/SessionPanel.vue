<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, getSessions, signOutAll } from '../../lib/api'
import type { SessionPage } from '../../lib/api'
import { copy } from '../../lib/copy'
import { language } from '../../lib/preferences'
import { useAuthFeedback } from '../../lib/useAuthFeedback'
import PrimaryButton from '../ui/PrimaryButton.vue'
import BackButton from '../ui/BackButton.vue'
import RefreshButton from '../ui/RefreshButton.vue'
import ControlIcon from '../ui/ControlIcon.vue'

const emit = defineEmits<{ back: []; signedOut: []; expired: [] }>()
const page = ref(1)
const sessions = ref<SessionPage | null>(null)
const loading = ref(true)
const busy = ref(false)
const confirming = ref(false)
const heading = ref<HTMLElement | null>(null)
const confirmationHeading = ref<HTMLElement | null>(null)
const revokeButton = ref<HTMLButtonElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, clearErrors, showError } = useAuthFeedback(errorSummary)
const formatter = computed(
  () =>
    new Intl.DateTimeFormat(language.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
)

function formatTime(value: string): string {
  return formatter.value.format(new Date(value))
}

async function handleError(cause: unknown): Promise<void> {
  if (cause instanceof ApiError && cause.status === 403) {
    // A forbidden mutation may be a stale CSRF token; confirm authentication first.
    try {
      await apiRequest('auth/me/')
    } catch (checkError) {
      if (checkError instanceof ApiError && checkError.status === 403) {
        emit('expired')
        return
      }
    }
  }
  await showError(cause, 'sessions')
}

async function load(targetPage = page.value): Promise<void> {
  if (busy.value) return
  busy.value = true
  loading.value = true
  sessions.value = null
  clearErrors()
  try {
    sessions.value = await getSessions(targetPage)
    page.value = targetPage
  } catch (cause) {
    await handleError(cause)
  } finally {
    loading.value = false
    busy.value = false
  }
}

async function confirm(): Promise<void> {
  clearErrors()
  confirming.value = true
  await nextTick()
  confirmationHeading.value?.focus()
}

async function cancel(): Promise<void> {
  confirming.value = false
  clearErrors()
  await nextTick()
  revokeButton.value?.focus()
}

async function revoke(): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    await signOutAll()
    emit('signedOut')
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  heading.value?.focus()
  await load()
})
</script>

<template>
  <div class="session-panel" :aria-busy="busy">
    <BackButton :disabled="busy" :label="copy.backToSettings" @click="emit('back')" />
    <div class="form-heading">
      <div class="session-title-row">
        <h2 id="form-title" ref="heading" tabindex="-1">{{ copy.sessionsTitle }}</h2>
        <RefreshButton icon-only :busy="busy || confirming" @click="load(1)" />
      </div>
      <p>{{ copy.sessionsSubtitle }}</p>
    </div>
    <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ error }}
    </div>
    <template v-if="confirming">
      <section class="session-confirmation" aria-labelledby="confirm-session-title">
        <h3 id="confirm-session-title" ref="confirmationHeading" tabindex="-1">
          {{ copy.confirmSignOutAll }}
        </h3>
        <p>{{ copy.signOutAllNote }}</p>
        <div class="form-actions">
          <PrimaryButton type="button" :busy="busy" @click="revoke">{{
            copy.signOutAll
          }}</PrimaryButton>
          <button class="secondary-button" type="button" :disabled="busy" @click="cancel">
            {{ copy.cancel }}
          </button>
        </div>
      </section>
    </template>
    <template v-else>
      <p v-if="loading" role="status">{{ copy.loading }}</p>
      <template v-else-if="sessions">
        <ul v-if="sessions.results.length" class="session-list" :aria-label="copy.sessionsTitle">
          <li
            v-for="(session, index) in sessions.results"
            :key="index"
            class="session-row"
            :class="{ 'session-row-current': session.is_current }"
          >
            <span class="feature-icon session-device-icon"><ControlIcon name="devices" /></span>
            <div class="session-device">
              <strong
                ><bdi>{{
                  session.browser === 'Unknown browser' ? copy.unknownBrowser : session.browser
                }}</bdi>
                /
                <bdi>{{
                  session.device === 'Unknown device' ? copy.unknownDevice : session.device
                }}</bdi></strong
              >
              <span v-if="session.is_current" class="session-current">{{ copy.thisDevice }}</span>
            </div>
            <dl class="session-times">
              <div>
                <dt>{{ copy.signedInAt }}</dt>
                <dd>
                  <time v-if="session.signed_in_at" :datetime="session.signed_in_at">{{
                    formatTime(session.signed_in_at)
                  }}</time><span v-else>{{ copy.unknownSignIn }}</span>
                </dd>
              </div>
              <div>
                <dt>{{ copy.lastActiveAt }}</dt>
                <dd>
                  <time :datetime="session.last_active_at">{{
                    formatTime(session.last_active_at)
                  }}</time>
                </dd>
              </div>
            </dl>
          </li>
        </ul>
        <p v-else role="status">{{ copy.noSessions }}</p>
        <nav
          v-if="sessions.previous || sessions.next"
          class="session-pagination"
          :aria-label="copy.sessionsTitle"
        >
          <button
            class="text-button"
            type="button"
            :disabled="busy || !sessions.previous"
            @click="load(page - 1)"
          >
            {{ copy.previousPage }}
          </button>
          <span role="status">{{ copy.sessionPage.replace('{page}', String(page)) }}</span>
          <button
            class="text-button"
            type="button"
            :disabled="busy || !sessions.next"
            @click="load(page + 1)"
          >
            {{ copy.nextPage }}
          </button>
        </nav>
      </template>
      <p class="form-note">{{ copy.sessionsHint }} {{ copy.sessionsLegacy }}</p>
      <button
        ref="revokeButton"
        class="session-revoke"
        type="button"
        :disabled="busy"
        @click="confirm"
      >
        {{ copy.signOutAll }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.session-list {
  list-style: none;
  margin: 20px 0;
  padding: 0;
  border-top: 1px solid var(--line);
}
.session-row {
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.session-device {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  overflow-wrap: anywhere;
}
.session-current {
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--secondary);
  color: var(--accent);
  font-size: 12px;
}
.session-times {
  margin: 14px 0 0;
  font-size: 12px;
}
.session-times > div {
  margin-top: 8px;
}
.session-times dt {
  color: var(--muted);
}
.session-times dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.session-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.session-revoke {
  width: 100%;
  min-height: 52px;
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--card);
  border: 1px solid var(--error);
  border-radius: var(--radius-control);
  color: var(--error);
}
.session-confirmation {
  background: var(--secondary);
  padding: 20px;
  border-radius: var(--radius-control);
}
.session-confirmation h3 {
  margin-top: 0;
  font-size: 20px;
}
.session-confirmation p {
  color: var(--muted);
}
</style>
