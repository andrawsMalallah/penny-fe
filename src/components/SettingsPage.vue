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
import AccountSelect from './AccountSelect.vue'
import { accountCopy } from '../lib/accountCopy'
import { designCopy } from '../lib/designCopy'
import ControlIcon from './ControlIcon.vue'

const TwoFactorPanel = defineAsyncComponent(() => import('./TwoFactorPanel.vue'))
const SessionPanel = defineAsyncComponent(() => import('./SessionPanel.vue'))
const emit = defineEmits<{
  expired: []
  signedOut: []
  saved: [language: 'en' | 'ar']
  accounts: []
}>()
const panel = ref<'settings' | 'factor' | 'sessions'>('settings')
const category = ref<'general' | 'security'>('general')
const mobileDetail = ref(false)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, clearErrors, showError, fieldError } = useAuthFeedback(errorSummary)
const currency = ref<UserSettings['default_currency']>('')
const rate = ref('')
const defaultAccount = ref('')
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
    defaultAccount.value = values.default_account ? String(values.default_account) : ''
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
      default_account: defaultAccount.value ? Number(defaultAccount.value) : null,
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

async function selectCategory(value: 'general' | 'security'): Promise<void> {
  category.value = value
  mobileDetail.value = true
  await nextTick()
  document.getElementById(value === 'general' ? 'appearance-title' : 'security-title')?.focus()
}

async function closeCategory(): Promise<void> {
  mobileDetail.value = false
  await nextTick()
  document.getElementById(`settings-category-${category.value}`)?.focus()
}
</script>

<template>
  <section class="settings-page" :aria-busy="busy" :aria-label="copy.settings">
    <div class="settings-heading">
      <h1 ref="heading" tabindex="-1">{{ copy.settings }}</h1>
      <p>{{ copy.settingsIntro }}</p>
    </div>
    <div
      class="settings-grid"
      :class="{ 'settings-mobile-detail': mobileDetail || panel !== 'settings' }"
    >
      <nav class="settings-categories" :aria-label="designCopy.settingsMenu">
        <button
          id="settings-category-general"
          class="settings-category"
          type="button"
          :aria-pressed="category === 'general' && panel === 'settings'"
          :disabled="busy || panel !== 'settings'"
          @click="selectCategory('general')"
        >
          <ControlIcon name="settings" /><span
            ><strong>{{ designCopy.general }}</strong
            ><span>{{ designCopy.generalHelp }}</span></span
          ><ControlIcon class="category-chevron" name="chevron" />
        </button>
        <button
          id="settings-category-security"
          class="settings-category"
          type="button"
          :aria-pressed="category === 'security' || panel === 'factor'"
          :disabled="busy || panel !== 'settings'"
          @click="selectCategory('security')"
        >
          <ControlIcon name="shield" /><span
            ><strong>{{ copy.security }}</strong
            ><span>{{ designCopy.securityHelp }}</span></span
          ><ControlIcon class="category-chevron" name="chevron" />
        </button>
        <button
          id="settings-category-devices"
          class="settings-category"
          type="button"
          :aria-pressed="panel === 'sessions'"
          :disabled="busy || panel !== 'settings'"
          @click="openPanel('sessions', $event)"
        >
          <ControlIcon name="devices" /><span
            ><strong>{{ copy.sessionsTitle }}</strong
            ><span>{{ designCopy.devicesHelp }}</span></span
          ><ControlIcon class="category-chevron" name="chevron" />
        </button>
      </nav>
      <div class="settings-content surface-panel">
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
          <BackButton
            class="mobile-settings-back"
            :disabled="busy"
            :label="copy.backToSettings"
            @click="closeCategory"
          />
          <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
            {{ error }}
          </div>
          <p v-if="loading" role="status">{{ copy.loading }}</p>
          <button v-if="!loaded && !loading" class="text-button" type="button" @click="load">
            {{ copy.retry }}
          </button>
          <form
            v-if="loaded && category === 'general'"
            @submit.prevent="save"
            @input="saved = false"
            @change="saved = false"
          >
            <section class="settings-section" aria-labelledby="appearance-title">
              <div class="settings-section-heading">
                <h2 id="appearance-title" tabindex="-1">{{ copy.languageAppearance }}</h2>
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
              <FormField
                id="default-account"
                :label="accountCopy.defaultAccount"
                :help="accountCopy.defaultHelp"
                :error="fieldError('default_account')"
              >
                <template #default="{ describedBy, invalid }">
                  <AccountSelect
                    id="default-account"
                    v-model="defaultAccount"
                    resource="accounts"
                    :empty-label="accountCopy.noDefault"
                    :disabled="busy"
                    :invalid="invalid"
                    :described-by="describedBy"
                    @error="handleError"
                  />
                </template>
              </FormField>
              <button type="button" class="text-button" :disabled="busy" @click="emit('accounts')">
                {{ accountCopy.accounts }}
              </button>
            </section>
            <div class="settings-save">
              <PrimaryButton :busy="busy">{{ copy.saveSettings }}</PrimaryButton>
              <p v-if="saved" class="notice" role="status">{{ copy.settingsSaved }}</p>
            </div>
          </form>
          <section
            v-if="category === 'security'"
            class="settings-section"
            aria-labelledby="security-title"
          >
            <div class="settings-section-heading">
              <h2 id="security-title" tabindex="-1">{{ copy.security }}</h2>
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
      </div>
    </div>
  </section>
</template>
