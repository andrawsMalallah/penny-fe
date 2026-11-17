<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, type UserSettings } from '../lib/api'
import {
  formatMoney,
  getAccountPage,
  type AccountGroup,
  type AccountValues,
  type MoneyAccount,
  type RecordPage,
} from '../lib/accounts'
import { accountCopy as text } from '../lib/accountCopy'
import { language } from '../lib/preferences'
import BackButton from './BackButton.vue'
import ControlIcon from './ControlIcon.vue'
import PageControls from './PageControls.vue'
import PrimaryButton from './PrimaryButton.vue'

const AccountEditor = defineAsyncComponent(() => import('./AccountEditor.vue'))
const emit = defineEmits<{ back: []; expired: []; settings: [] }>()
const groups = ref(false)
const archived = ref(false)
const resource = computed(() => (groups.value ? 'account-groups' : 'accounts'))
const records = ref<RecordPage<MoneyAccount | AccountGroup> | null>(null)
const page = ref(1)
const busy = ref(false)
const loading = ref(false)
const defaultAccount = ref<number | null>(null)
const editing = ref(false)
const item = ref<MoneyAccount | AccountGroup | null>(null)
const confirmation = ref<MoneyAccount | AccountGroup | null>(null)
const heading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const confirmHeading = ref<HTMLElement | null>(null)
const errorKey = ref<'error' | 'validation' | 'unavailable' | 'stale' | ''>('')
const fieldMessages = ref<Record<string, string[]>>({})
const fields = computed(() =>
  Object.fromEntries(
    Object.entries(fieldMessages.value).map(([key, messages]) => [
      key,
      language.value === 'ar' ? text.value.validation : (messages[0] ?? ''),
    ]),
  ),
)
const notice = ref<'saved' | 'archiveDone' | 'restored' | ''>('')
let triggerId = ''

function clearError(): void {
  errorKey.value = ''
  fieldMessages.value = {}
}
async function handleError(cause: unknown): Promise<void> {
  if (cause instanceof ApiError && cause.status === 403) {
    try {
      await apiRequest('auth/me/')
    } catch (check) {
      if (check instanceof ApiError && check.status === 403) {
        emit('expired')
        return
      }
    }
  }
  fieldMessages.value = cause instanceof ApiError ? cause.fields : {}
  errorKey.value =
    cause instanceof ApiError
      ? cause.status === 400
        ? 'validation'
        : cause.status === 404
          ? 'unavailable'
          : cause.status === 403
            ? 'stale'
            : 'error'
      : 'error'
  await nextTick()
  errorSummary.value?.focus()
}
async function fetchRecords(value: number): Promise<void> {
  const [result, settings] = await Promise.all([
    getAccountPage<MoneyAccount | AccountGroup>(resource.value, value, archived.value),
    apiRequest<UserSettings>('settings/'),
  ])
  records.value = result
  defaultAccount.value = settings.default_account
  page.value = value
}
async function load(value = 1): Promise<void> {
  if (busy.value) return
  busy.value = true
  loading.value = true
  records.value = null
  notice.value = ''
  clearError()
  try {
    await fetchRecords(value)
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
    loading.value = false
  }
}
async function switchList(value: boolean, archive = false): Promise<void> {
  if (busy.value) return
  groups.value = value
  archived.value = archive
  editing.value = false
  confirmation.value = null
  await load()
}
function edit(record: MoneyAccount | AccountGroup | null, event: Event): void {
  triggerId = (event.currentTarget as HTMLElement).id
  item.value = record
  editing.value = true
  notice.value = ''
  clearError()
}
async function closeEditor(): Promise<void> {
  editing.value = false
  confirmation.value = null
  clearError()
  await nextTick()
  const target = document.getElementById(triggerId)
  if (target) target.focus()
  else heading.value?.focus()
}
async function save(values: AccountValues | { name: string }): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearError()
  try {
    await apiRequest(`${resource.value}/${item.value ? `${item.value.id}/` : ''}`, values)
    editing.value = false
    notice.value = 'saved'
    // Refetch authoritative data after every successful mutation.
    records.value = null
    await fetchRecords(1)
    await nextTick()
    heading.value?.focus()
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function confirm(record: MoneyAccount | AccountGroup, event: Event): Promise<void> {
  triggerId = (event.currentTarget as HTMLElement).id
  confirmation.value = record
  notice.value = ''
  clearError()
  await nextTick()
  confirmHeading.value?.focus()
}
async function archive(): Promise<void> {
  if (busy.value || !confirmation.value) return
  busy.value = true
  clearError()
  try {
    const restoring = confirmation.value.archived
    await apiRequest(`${resource.value}/${confirmation.value.id}/archive/`, {
      archived: !restoring,
    })
    confirmation.value = null
    notice.value = restoring ? 'restored' : 'archiveDone'
    records.value = null
    await fetchRecords(1)
    await nextTick()
    heading.value?.focus()
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(language.value === 'ar' ? 'ar-IQ' : 'en', {
    dateStyle: 'medium',
  }).format(new Date(value))
}
onMounted(async () => {
  heading.value?.focus()
  await load()
})
</script>
<template>
  <section class="accounts-page" :aria-busy="busy" :aria-label="text.accounts">
    <BackButton :disabled="busy" @click="emit('back')" />
    <div class="accounts-heading">
      <div>
        <h1 ref="heading" tabindex="-1">{{ text.accounts }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <button
        class="secondary-button"
        type="button"
        :disabled="busy || editing || !!confirmation"
        @click="emit('settings')"
      >
        {{ text.defaultAccount }}
      </button>
    </div>
    <div v-if="errorKey" ref="errorSummary" class="error-summary" tabindex="-1" role="alert">
      {{ text[errorKey] }}
      <p v-for="(message, field) in fields" :key="field">{{ message }}</p>
    </div>
    <p v-if="notice" class="notice" role="status">{{ text[notice] }}</p>
    <AccountEditor
      v-if="editing"
      :item="item"
      :groups="groups"
      :busy="busy"
      :fields="fields"
      @save="save"
      @cancel="closeEditor"
      @error="handleError"
    />
    <section v-else-if="confirmation" class="account-editor" aria-labelledby="archive-title">
      <h2 id="archive-title" ref="confirmHeading" tabindex="-1">
        {{ confirmation.archived ? text.restoreTitle : text.archiveTitle }}
      </h2>
      <p class="confirmation-name">{{ confirmation.name }}</p>
      <p>
        {{
          confirmation.archived
            ? text.restoreHelp
            : groups
              ? text.archiveGroupHelp
              : text.archiveHelp
        }}
      </p>
      <div class="form-actions">
        <PrimaryButton type="button" :busy="busy" @click="archive">{{
          confirmation.archived ? text.restore : text.archive
        }}</PrimaryButton><button
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="closeEditor"
        >
          {{ text.cancel }}
        </button>
      </div>
    </section>
    <template v-else>
      <div class="accounts-toolbar">
        <nav class="account-tabs" :aria-label="text.accounts">
          <button type="button" :aria-pressed="!groups" :disabled="busy" @click="switchList(false)">
            {{ text.accounts }}</button><button
            type="button"
            :aria-pressed="groups"
            :disabled="busy"
            @click="switchList(true)"
          >
            {{ text.groups }}
          </button>
        </nav>
        <button
          id="add-account-item"
          class="primary-button compact-primary"
          type="button"
          :disabled="busy"
          @click="edit(null, $event)"
        >
          {{ groups ? text.addGroup : text.addAccount }}
        </button>
      </div>
      <div class="accounts-filter">
        <div class="account-filter-options">
          <button
            type="button"
            :aria-pressed="!archived"
            :disabled="busy"
            @click="switchList(groups, false)"
          >
            {{ text.active }}</button><button
            type="button"
            :aria-pressed="archived"
            :disabled="busy"
            @click="switchList(groups, true)"
          >
            {{ text.archived }}
          </button>
        </div>
        <button
          class="secondary-button refresh-icon-button"
          type="button"
          :disabled="busy"
          :aria-label="text.refresh"
          :title="text.refresh"
          @click="load(page)"
        >
          <ControlIcon name="refresh" />
        </button>
      </div>
      <p v-if="groups" class="field-help">{{ text.groupIntro }}</p>
      <p v-else-if="records?.count" class="balance-caption">{{ text.asOfNow }}</p>
      <p v-if="loading" role="status">{{ text.loading }}</p>
      <button v-if="!records && !loading" type="button" class="secondary-button" @click="load()">
        {{ text.retry }}
      </button>
      <div v-if="records && !records.count" class="accounts-empty">
        <h2>{{ archived ? text.noArchived : groups ? text.noGroups : text.noAccounts }}</h2>
        <p>
          {{ archived ? text.noArchivedHelp : groups ? text.noGroupsHelp : text.noAccountsHelp }}
        </p>
      </div>
      <ul v-if="records?.count" class="account-list">
        <li v-for="record in records.results" :key="record.id" class="account-row">
          <div class="account-identity">
            <h2>{{ record.name }}</h2>
            <span v-if="'group_name' in record" class="account-group-name">{{
              record.group_name || text.ungrouped
            }}</span><span
              v-if="!groups && record.id === defaultAccount"
              class="default-account-badge"
              >{{ text.defaultBadge }}</span
            >
          </div>
          <template v-if="'balance_iqd' in record">
            <dl class="account-balances">
              <div class="currency-iqd">
                <dt>IQD</dt>
                <dd dir="ltr">{{ formatMoney(record.balance_iqd) }}</dd>
              </div>
              <div class="currency-usd">
                <dt>USD</dt>
                <dd dir="ltr">{{ formatMoney(record.balance_usd) }}</dd>
              </div>
            </dl>
            <details class="account-opening">
              <summary>{{ text.opening }}</summary>
              <dl>
                <div>
                  <dt>IQD</dt>
                  <dd dir="ltr">{{ formatMoney(record.opening.iqd) }}</dd>
                </div>
                <div>
                  <dt>USD</dt>
                  <dd dir="ltr">{{ formatMoney(record.opening.usd) }}</dd>
                </div>
              </dl>
              <p>{{ text.openingRecorded }}: {{ dateLabel(record.opening.recorded_at) }}</p>
            </details>
            <p v-if="record.archived" class="field-help account-archive-note">
              {{ text.archiveFunds }}
            </p>
          </template>
          <div class="account-row-actions">
            <button
              v-if="!record.archived"
              :id="`edit-${record.id}`"
              class="secondary-button"
              type="button"
              :disabled="busy"
              :aria-label="`${text.edit}: ${record.name}`"
              @click="edit(record, $event)"
            >
              {{ text.edit }}</button><button
              :id="`archive-${record.id}`"
              class="text-button"
              type="button"
              :disabled="busy"
              :aria-label="`${record.archived ? text.restore : text.archive}: ${record.name}`"
              @click="confirm(record, $event)"
            >
              {{ record.archived ? text.restore : text.archive }}
            </button>
          </div>
        </li>
      </ul>
      <PageControls
        v-if="records"
        :page="page"
        :next="!!records.next"
        :previous="!!records.previous"
        :busy="busy"
        @change="load"
      />
    </template>
  </section>
</template>
