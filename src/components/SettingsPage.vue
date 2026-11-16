<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, type UserSettings } from '../lib/api'
import { copy } from '../lib/copy'
import { language } from '../lib/preferences'
import { useAuthFeedback } from '../lib/useAuthFeedback'
import PreferenceControls from './PreferenceControls.vue'
import FormField from './FormField.vue'
import PrimaryButton from './PrimaryButton.vue'
import BackButton from './BackButton.vue'
import SelectControl from './SelectControl.vue'

const TwoFactorPanel = defineAsyncComponent(() => import('./TwoFactorPanel.vue'))
const SessionPanel = defineAsyncComponent(() => import('./SessionPanel.vue'))
const emit = defineEmits<{ back: []; expired: []; signedOut: []; saved: [language: 'en' | 'ar'] }>()
const panel = ref<'settings' | 'factor' | 'sessions'>('settings')
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, clearErrors, showError, fieldError } = useAuthFeedback(errorSummary)
const currency = ref<UserSettings['default_currency']>('')
const rate = ref('')
const loading = ref(true)
const busy = ref(false)
const loaded = ref(false)
const saved = ref(false)
const securityTrigger = ref<HTMLButtonElement | null>(null)

async function handleError(cause: unknown): Promise<void> {
  if (cause instanceof ApiError && cause.status === 403) {
    try {
      await apiRequest('auth/me/')
    } catch (checkError) {
      if (checkError instanceof ApiError && checkError.status === 403) {
        emit('expired')
        return
      }
    }
  }
  await showError(cause, 'settings')
}

async function load(): Promise<void> {
  if (busy.value) return
  busy.value = true
  loading.value = true
  loaded.value = false
  saved.value = false
  clearErrors()
  try {
    const values = await apiRequest<UserSettings>('settings/')
    language.value = values.language
    currency.value = values.default_currency
    rate.value = values.exchange_rate ?? ''
    loaded.value = true
  } catch (cause) {
    await handleError(cause)
  } finally {
    loading.value = false
    busy.value = false
  }
}

async function save(): Promise<void> {
  if (busy.value || !loaded.value) return
  busy.value = true
  saved.value = false
  clearErrors()
  try {
    const values = await apiRequest<UserSettings>('settings/', {
      language: language.value,
      default_currency: currency.value,
      exchange_rate: rate.value.trim() || null,
    })
    rate.value = values.exchange_rate ?? ''
    emit('saved', values.language)
    saved.value = true
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}

function openPanel(value: 'factor' | 'sessions', event: Event): void {
  securityTrigger.value = event.currentTarget as HTMLButtonElement
  panel.value = value
  saved.value = false
}

async function closePanel(): Promise<void> {
  panel.value = 'settings'
  await nextTick()
  // Restore focus to the same security action after its lazy panel unmounts.
  document.getElementById(securityTrigger.value?.id ?? '')?.focus()
}

onMounted(async () => {
  heading.value?.focus()
  await load()
})
</script>

<template>
  <section class="settings-page" :aria-busy="busy" :aria-label="copy.settings">
    <div v-if="panel !== 'settings'" class="settings-detail">
      <TwoFactorPanel v-if="panel === 'factor'" @back="closePanel" @expired="emit('expired')" />
      <SessionPanel
        v-else
        @back="closePanel"
        @expired="emit('expired')"
        @signed-out="emit('signedOut')"
      />
    </div>
    <template v-else>
      <BackButton :disabled="busy" @click="emit('back')" />
      <div class="settings-heading">
        <h1 ref="heading" tabindex="-1">{{ copy.settings }}</h1>
        <p>{{ copy.settingsIntro }}</p>
      </div>
      <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
        {{ error }}
      </div>
      <p v-if="loading" role="status">{{ copy.loading }}</p>
      <button v-if="!loaded && !loading" class="text-button" type="button" @click="load">
        {{ copy.retry }}
      </button>
      <form v-if="loaded" @submit.prevent="save" @input="saved = false" @change="saved = false">
        <section class="settings-section" aria-labelledby="appearance-title">
          <div class="settings-section-heading">
            <h2 id="appearance-title">{{ copy.languageAppearance }}</h2>
            <p>{{ copy.appearanceHelp }}</p>
          </div>
          <PreferenceControls :disabled="busy" />
        </section>
        <section class="settings-section" aria-labelledby="money-title">
          <div class="settings-section-heading">
            <h2 id="money-title">{{ copy.moneyPreferences }}</h2>
            <p>{{ copy.moneyPreferencesHelp }}</p>
          </div>
          <FormField
            id="default-currency"
            :label="copy.defaultCurrency"
            :error="fieldError('default_currency')"
          >
            <template #default="{ describedBy, invalid }">
              <SelectControl
                id="default-currency"
                v-model="currency"
                :disabled="busy"
                :invalid="invalid"
                :described-by="describedBy"
              >
                <option value="">{{ copy.chooseLater }}</option>
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </SelectControl>
            </template>
          </FormField>
          <FormField
            id="exchange-rate"
            :label="copy.exchangeRate"
            :help="copy.exchangeRateHelp"
            :error="fieldError('exchange_rate')"
          >
            <template #default="{ describedBy, invalid }">
              <div class="rate-control">
                <span dir="ltr">1 USD =</span>
                <input
                  id="exchange-rate"
                  v-model="rate"
                  type="text"
                  inputmode="decimal"
                  dir="ltr"
                  maxlength="19"
                  :disabled="busy"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                  autocomplete="off"
                />
                <span>IQD</span>
              </div>
            </template>
          </FormField>
          <p class="field-help">{{ copy.defaultAccountLater }}</p>
        </section>
        <div class="settings-save">
          <PrimaryButton :busy="busy">{{ copy.saveSettings }}</PrimaryButton>
          <p v-if="saved" class="notice" role="status">{{ copy.settingsSaved }}</p>
        </div>
      </form>
      <section class="settings-section" aria-labelledby="security-title">
        <div class="settings-section-heading">
          <h2 id="security-title">{{ copy.security }}</h2>
          <p>{{ copy.securityHelp }}</p>
        </div>
        <button
          id="settings-factor"
          class="settings-action"
          type="button"
          :disabled="busy"
          @click="openPanel('factor', $event)"
        >
          <span
            ><strong>{{ copy.factorTitle }}</strong
            ><span>{{ copy.factorIntro }}</span></span
          ><span aria-hidden="true">›</span>
        </button>
        <button
          id="settings-sessions"
          class="settings-action"
          type="button"
          :disabled="busy"
          @click="openPanel('sessions', $event)"
        >
          <span
            ><strong>{{ copy.sessionsTitle }}</strong
            ><span>{{ copy.sessionsSubtitle }}</span></span
          ><span aria-hidden="true">›</span>
        </button>
      </section>
    </template>
  </section>
</template>
