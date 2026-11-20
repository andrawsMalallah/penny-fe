<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { ApiError, apiRequest, factorMutation } from '../../lib/api'
import type { FactorSetup, FactorStatus, RecoveryCodes } from '../../lib/api'
import { copy } from '../../lib/copy'
import { useAuthFeedback } from '../../lib/useAuthFeedback'
import AuthInput from '../auth/AuthInput.vue'
import CopyButton from '../ui/CopyButton.vue'
import FactorCodeInput from '../auth/FactorCodeInput.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'
import BackButton from '../ui/BackButton.vue'
import RefreshButton from '../ui/RefreshButton.vue'

const emit = defineEmits<{ back: []; expired: [] }>()
type Step = 'status' | 'password' | 'setup' | 'disable' | 'replace' | 'codes'
const step = ref<Step>('status')
const status = ref<FactorStatus | null>(null)
const setup = ref<FactorSetup | null>(null)
const codes = ref<string[]>([])
const password = ref('')
const code = ref('')
const recovery = ref(false)
const busy = ref(false)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, clearErrors, fieldError, showError } = useAuthFeedback(errorSummary)
const title = computed(() =>
  step.value === 'codes' ? copy.value.factorCodesTitle : copy.value.factorTitle,
)

async function moveTo(value: Step): Promise<void> {
  step.value = value
  password.value = ''
  code.value = ''
  recovery.value = false
  clearErrors()
  await nextTick()
  heading.value?.focus()
}

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
  await showError(cause, 'factor')
}

async function load(): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    status.value = await apiRequest<FactorStatus>('auth/2fa/')
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}

async function submit(): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    if (step.value === 'password') {
      setup.value = await apiRequest<FactorSetup>('auth/2fa/setup/', { password: password.value })
      await moveTo('setup')
    } else if (step.value === 'setup') {
      const result = await factorMutation<RecoveryCodes>('enable', { otp: code.value })
      setup.value = null
      codes.value = result.recovery_codes
      status.value = { enabled: true, recovery_remaining: codes.value.length }
      await moveTo('codes')
    } else if (step.value === 'replace' || step.value === 'disable') {
      const disabling = step.value === 'disable'
      const result = await factorMutation<RecoveryCodes | undefined>(
        disabling ? 'disable' : 'recovery-codes',
        {
          password: password.value,
          otp: code.value,
          recovery: recovery.value,
        },
      )
      codes.value = result?.recovery_codes ?? []
      status.value = { enabled: !disabling, recovery_remaining: codes.value.length }
      await moveTo(disabling ? 'status' : 'codes')
    }
  } catch (cause) {
    password.value = ''
    code.value = ''
    await handleError(cause)
  } finally {
    busy.value = false
  }
}

async function cancel(): Promise<void> {
  if (busy.value) return
  if (step.value === 'setup') {
    busy.value = true
    try {
      await apiRequest('auth/2fa/setup/cancel/', {})
      setup.value = null
      await moveTo('status')
    } catch (cause) {
      await handleError(cause)
    } finally {
      busy.value = false
    }
  } else {
    codes.value = []
    await moveTo('status')
  }
  if (step.value === 'status') await load()
}

onMounted(async () => {
  heading.value?.focus()
  await load()
})
onBeforeUnmount(() => {
  password.value = ''
  code.value = ''
  setup.value = null
  codes.value = []
})
</script>

<template>
  <div class="two-factor-panel" :aria-busy="busy">
    <BackButton
      v-if="step === 'status'"
      :disabled="busy"
      :label="copy.backToSettings"
      @click="emit('back')"
    />
    <BackButton v-else-if="step !== 'codes'" :disabled="busy" @click="cancel" />
    <BackButton v-else :label="copy.factorCodesSaved" @click="cancel" />
    <div class="form-heading">
      <div class="factor-title-row">
        <h2 id="form-title" ref="heading" tabindex="-1">{{ title }}</h2>
        <CopyButton
          v-if="step === 'codes'"
          :text="codes.join('\n')"
          :label="copy.copyRecoveryCodes"
        />
      </div>
      <p>{{ step === 'codes' ? copy.factorCodesBody : copy.factorIntro }}</p>
    </div>
    <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ error }}
    </div>
    <template v-if="step === 'status'">
      <p v-if="busy" role="status">{{ copy.loading }}</p>
      <template v-else-if="status">
        <p class="notice" role="status">
          {{ status.enabled ? copy.factorEnabled : copy.factorDisabled }}
        </p>
        <template v-if="status.enabled">
          <p>{{ copy.factorRemaining.replace('{count}', String(status.recovery_remaining)) }}</p>
          <div class="factor-actions">
            <button class="text-button" type="button" @click="moveTo('replace')">
              {{ copy.factorReplace }}</button><button
              class="text-button"
              type="button"
              @click="moveTo('disable')"
            >
              {{ copy.factorDisable }}
            </button>
          </div>
          <p class="form-note">{{ copy.factorResetNote }}</p>
        </template>
        <PrimaryButton v-else type="button" @click="moveTo('password')">{{
          copy.factorSetup
        }}</PrimaryButton>
      </template>
      <RefreshButton v-else :busy="busy" @click="load" />
    </template>
    <template v-else-if="step === 'codes'">
      <ul class="recovery-code-list" :aria-label="copy.factorCodesTitle">
        <li v-for="item in codes" :key="item">
          <code dir="ltr">{{ item }}</code>
        </li>
      </ul>
      <p class="form-note">{{ copy.factorBackWarning }}</p>
      <PrimaryButton type="button" @click="cancel">{{ copy.factorCodesSaved }}</PrimaryButton>
    </template>
    <template v-else>
      <form @submit.prevent="submit">
        <template v-if="step === 'setup' && setup">
          <div class="factor-setup-grid">
            <div class="factor-scan-section">
              <p>{{ copy.factorScan }}</p>
              <img
                class="factor-qr"
                :src="setup.qr_code"
                :alt="copy.factorQrAlt"
                width="240"
                height="240"
              />
            </div>
            <div class="factor-manual-section">
              <p class="form-note">{{ copy.factorManual }}</p>
              <div class="factor-key">
                <div class="factor-key-heading">
                  <strong>{{ copy.factorKey }}</strong>
                  <CopyButton :text="setup.secret" :label="copy.copySetupKey" :disabled="busy" />
                </div>
                <code dir="ltr">{{ setup.secret }}</code>
              </div>
              <p class="form-note">{{ copy.factorSetupExpiry }}</p>
            </div>
          </div>
        </template>
        <p v-if="step === 'replace'">{{ copy.factorReplaceNote }}</p>
        <p v-else-if="step === 'disable'">{{ copy.factorDisableNote }}</p>
        <AuthInput
          v-if="step !== 'setup'"
          id="factor-password"
          v-model="password"
          :label="copy.factorPassword"
          type="password"
          autocomplete="current-password"
          :maxlength="256"
          :disabled="busy"
          :error="fieldError('password')"
        />
        <FactorCodeInput
          v-if="step !== 'password'"
          id="settings-factor-code"
          v-model="code"
          v-model:recovery="recovery"
          :allow-recovery="step !== 'setup'"
          :busy="busy"
        />
        <p class="form-note">{{ copy.factorSessionNote }}</p>
        <div class="form-actions">
          <PrimaryButton :busy="busy">{{
            step === 'password'
              ? copy.factorSetup
              : step === 'setup'
                ? copy.factorEnable
                : step === 'replace'
                  ? copy.factorReplace
                  : copy.factorDisable
          }}</PrimaryButton>
          <button class="secondary-button" type="button" :disabled="busy" @click="cancel">
            {{ copy.cancel }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.factor-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.factor-qr {
  display: block;
  max-width: 100%;
  height: auto;
  background: #fff;
  padding: 12px;
  margin: 24px auto;
  border-radius: var(--radius-card);
}
.factor-key {
  margin-top: 12px;
  padding: 16px;
  background: var(--secondary);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
}
.factor-key strong {
  font-size: 12px;
}
.factor-key code {
  display: block;
  overflow-wrap: anywhere;
  font-size: 16px;
  user-select: all;
}
.factor-key-heading,
.factor-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.factor-key-heading {
  margin-bottom: 8px;
}
.factor-title-row {
  margin-bottom: 8px;
}
.factor-title-row h2 {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.recovery-code-list {
  list-style: none;
  padding: 16px;
  background: var(--secondary);
  border-radius: var(--radius-control);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  font-size: 16px;
  text-align: center;
}
.recovery-code-list code {
  user-select: all;
}
</style>
