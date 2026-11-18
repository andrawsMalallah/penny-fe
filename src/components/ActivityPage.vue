<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onScopeDispose, ref } from 'vue'
import { activityFiltersFromHash } from '../lib/activityRoute'
import { activityLink } from '../lib/analytics'
import { ApiError, apiRequest, type UserSettings } from '../lib/api'
import { formatMoney, type RecordPage } from '../lib/accounts'
import { categoryName } from '../lib/categories'
import { activityCopy as text } from '../lib/activityCopy'
import { accountCopy } from '../lib/accountCopy'
import { language } from '../lib/preferences'
import { receivedCurrency } from '../lib/exchanges'
import { debtCopy } from '../lib/debtCopy'
import {
  dateLabel,
  getTransactions,
  newRequestId,
  type ActivityFilters as Filters,
  type MoneyTransaction,
  type TransactionKind,
  type TransactionValues,
} from '../lib/transactions'
import { useAuthFeedback } from '../lib/useAuthFeedback'
import ActivityFilters from './ActivityFilters.vue'
import PageControls from './PageControls.vue'
import PrimaryButton from './PrimaryButton.vue'
import BackButton from './BackButton.vue'
import RefreshButton from './RefreshButton.vue'
import ControlIcon from './ControlIcon.vue'

const TransactionEditor = defineAsyncComponent(() => import('./TransactionEditor.vue'))
const emit = defineEmits<{ expired: [] }>()
const emptyFilters = (): Filters => ({
  account: '',
  category: '',
  kind: '',
  currency: '',
  start: '',
  end: '',
})
const filters = ref(activityFiltersFromHash(window.location.hash))
const applied = ref({ ...filters.value })
const filterRouteVersion = ref(0)
const filtered = computed(() => Object.values(applied.value).some(Boolean))
const records = ref<RecordPage<MoneyTransaction> | null>(null)
const page = ref(1)
const busy = ref(false)
const editing = ref(false)
const item = ref<MoneyTransaction | null>(null)
const kind = ref<TransactionKind>('expense')
const defaults = ref<UserSettings>({
  language: 'en',
  default_account: null,
  default_currency: '',
  exchange_rate: null,
})
const confirmation = ref<MoneyTransaction | null>(null)
const heading = ref<HTMLElement | null>(null)
const confirmationHeading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, fieldErrors, clearErrors, showError } = useAuthFeedback(errorSummary)
const conflict = ref(false)
const notice = ref<'saved' | 'deleted' | ''>('')
let triggerId = ''
let requestId = ''
let pendingRouteRead = false
function clearError(): void {
  conflict.value = false
  clearErrors()
}
function kindLabel(value: TransactionKind): string {
  return value === 'debt_in' || value === 'debt_out' ? debtCopy.value[value] : text.value[value]
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
  if (cause instanceof ApiError && cause.status === 409) {
    conflict.value = true
    await nextTick()
    errorSummary.value?.focus()
    return
  }
  await showError(cause)
}
async function fetchRecords(value = 1): Promise<void> {
  const requested = { ...applied.value }
  const result = await getTransactions(requested, value)
  if (JSON.stringify(requested) !== JSON.stringify(applied.value)) return
  records.value = result
  page.value = value
}
async function load(value = 1): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearError()
  records.value = null
  notice.value = ''
  try {
    await fetchRecords(value)
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
    if (pendingRouteRead) {
      pendingRouteRead = false
      await load()
    }
  }
}
async function applyFilters(clear = false): Promise<void> {
  if (busy.value) return
  if (clear) filters.value = emptyFilters()
  window.history.replaceState(null, '', activityLink(filters.value))
  applied.value = { ...filters.value }
  await load()
}
async function edit(
  record: MoneyTransaction | null,
  selectedKind: TransactionKind,
  event: Event,
): Promise<void> {
  if (record?.debt) return
  if (busy.value) return
  triggerId = (event.currentTarget as HTMLElement).id
  busy.value = true
  notice.value = ''
  clearError()
  try {
    defaults.value = await apiRequest<UserSettings>('settings/')
    await apiRequest('expense-categories/initialize/', {})
    item.value = record ? await apiRequest<MoneyTransaction>(`transactions/${record.id}/`) : null
    requestId = record ? '' : await newRequestId()
    kind.value = selectedKind
    editing.value = true
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function closeEditor(): Promise<void> {
  editing.value = false
  confirmation.value = null
  item.value = null
  requestId = ''
  clearError()
  await nextTick()
  const trigger = document.getElementById(triggerId)
  if (trigger) trigger.focus()
  else heading.value?.focus()
}
async function save(values: TransactionValues): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearError()
  try {
    await apiRequest(`transactions/${item.value ? `${item.value.id}/` : ''}`, {
      ...values,
      ...(item.value ? { version: item.value.version } : { request_id: requestId }),
    })
    editing.value = false
    item.value = null
    requestId = ''
    records.value = null
    notice.value = 'saved'
    await fetchRecords()
    await nextTick()
    heading.value?.focus()
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function confirm(record: MoneyTransaction, event: Event): Promise<void> {
  triggerId = (event.currentTarget as HTMLElement).id
  confirmation.value = record
  notice.value = ''
  clearError()
  await nextTick()
  confirmationHeading.value?.focus()
}
async function remove(): Promise<void> {
  if (busy.value || !confirmation.value) return
  busy.value = true
  clearError()
  try {
    await apiRequest(`transactions/${confirmation.value.id}/delete/`, {
      version: confirmation.value.version,
    })
    confirmation.value = null
    records.value = null
    notice.value = 'deleted'
    await fetchRecords()
    await nextTick()
    heading.value?.focus()
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
const onRouteChange = (): void => {
  if (window.location.hash.split('?')[0] !== '#/activity') return
  filters.value = activityFiltersFromHash(window.location.hash)
  applied.value = { ...filters.value }
  // Route changes may select an item outside the picker's loaded page.
  // Remount the filter panel so each bounded picker resolves that selected item.
  filterRouteVersion.value += 1
  if (!editing.value && !confirmation.value) {
    if (busy.value) pendingRouteRead = true
    else void load()
  }
}
window.addEventListener('hashchange', onRouteChange)
onScopeDispose(() => window.removeEventListener('hashchange', onRouteChange))
</script>

<template>
  <section class="activity-page" :aria-busy="busy" :aria-label="text.title">
    <div class="activity-page-heading page-heading">
      <div>
        <h1 ref="heading" tabindex="-1">{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton
        v-if="!editing && !confirmation"
        :label="text.refresh"
        :busy="busy"
        icon-only
        @click="load()"
      />
    </div>
    <BackButton
      v-if="editing || confirmation"
      :label="text.back"
      :disabled="busy"
      @click="closeEditor"
    />
    <div
      v-if="error || conflict"
      ref="errorSummary"
      class="error-summary"
      role="alert"
      tabindex="-1"
    >
      {{ conflict ? text.conflict : fieldErrors.amount ? text.amountError : error }}
    </div>
    <p v-if="notice" class="notice" role="status">{{ text[notice] }}</p>
    <TransactionEditor
      v-if="editing"
      :item="item"
      :kind="kind"
      :defaults="defaults"
      :busy="busy"
      :fields="fieldErrors"
      @save="save"
      @cancel="closeEditor"
      @error="handleError"
    />
    <section
      v-else-if="confirmation"
      class="transaction-confirmation surface-panel"
      aria-labelledby="delete-transaction-title"
    >
      <h2 id="delete-transaction-title" ref="confirmationHeading" tabindex="-1">
        {{ text.deleteTitle }}
      </h2>
      <p class="confirmation-name">
        {{ kindLabel(confirmation.kind) }} ·
        <bdi>{{ formatMoney(confirmation.amount) }} {{ confirmation.currency }}</bdi>
      </p>
      <p dir="auto">{{ confirmation.account_name }}</p>
      <p v-if="confirmation.kind === 'exchange' && confirmation.received_amount">
        <bdi
          >{{ formatMoney(confirmation.received_amount) }}
          {{ receivedCurrency(confirmation.currency) }}</bdi
        >
      </p>
      <p v-if="confirmation.destination" dir="auto">
        {{ text.toAccount }}: {{ confirmation.destination_name }}
      </p>
      <p>{{ dateLabel(confirmation.date, language) }}</p>
      <p class="field-help">{{ text.deleteHelp }}</p>
      <div class="form-actions">
        <PrimaryButton type="button" :busy="busy" @click="remove">{{
          text.delete
        }}</PrimaryButton><button
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="closeEditor"
        >
          {{ accountCopy.cancel }}
        </button>
      </div>
    </section>
    <template v-else>
      <div class="activity-add-actions">
        <button
          id="add-expense"
          type="button"
          class="primary-button compact-primary"
          :disabled="busy"
          @click="edit(null, 'expense', $event)"
        >
          {{ text.addExpense }}
        </button>
        <button
          id="add-income"
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="edit(null, 'income', $event)"
        >
          {{ text.addIncome }}
        </button>
        <button
          id="add-transfer"
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="edit(null, 'transfer', $event)"
        >
          {{ text.addTransfer }}
        </button>
        <button
          id="add-exchange"
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="edit(null, 'exchange', $event)"
        >
          {{ text.addExchange }}
        </button>
      </div>
      <ActivityFilters
        :key="filterRouteVersion"
        v-model="filters"
        :busy="busy"
        :fields="fieldErrors"
        @apply="applyFilters()"
        @clear="applyFilters(true)"
        @error="handleError"
      />
      <p v-if="busy" role="status">{{ accountCopy.loading }}</p>
      <button v-if="!records && !busy" type="button" class="secondary-button" @click="load()">
        {{ accountCopy.retry }}
      </button>
      <div v-if="records && !records.count" class="accounts-empty">
        <h2>{{ filtered ? text.noMatches : text.empty }}</h2>
        <p>{{ filtered ? text.noMatchesHelp : text.emptyHelp }}</p>
      </div>
      <ul v-if="records?.count" class="transaction-list surface-panel">
        <li v-for="record in records.results" :key="record.id" class="transaction-row">
          <span class="transaction-direction" :class="`transaction-${record.kind}`"
            ><ControlIcon :name="record.kind"
          /></span>
          <div class="transaction-description">
            <h2>
              {{ kindLabel(record.kind)
              }}<span v-if="record.category">
                ·
                {{
                  categoryName(
                    { name_en: record.category_name_en, name_ar: record.category_name_ar },
                    language,
                  )
                }}</span
              >
            </h2>
            <p>
              <span v-if="record.destination">{{ text.fromAccount }}: </span>
              <span dir="auto">{{ record.account_name }}</span><span v-if="record.account_archived">
                ({{ text.archived }})</span
              >
            </p>
            <p v-if="record.destination">
              {{ text.toAccount }}: <span dir="auto">{{ record.destination_name }}</span>
              <span v-if="record.destination_archived"> ({{ text.archived }})</span>
            </p>
            <time :datetime="record.date">{{ dateLabel(record.date, language) }}</time>
            <p v-if="record.debt" dir="auto">{{ record.debt_person_name }}</p>
            <p v-if="record.exchange_rate">
              <bdi>1 USD = {{ record.exchange_rate }} IQD</bdi>
            </p>
            <p v-if="record.note" class="transaction-note" dir="auto">{{ record.note }}</p>
          </div>
          <div class="transaction-value" :class="`transaction-${record.kind}`">
            <bdi
              >{{
                record.kind === 'transfer'
                  ? ''
                  : record.kind === 'income' || record.kind === 'debt_in'
                    ? '+'
                    : '−'
              }}{{ formatMoney(record.amount) }}</bdi
            ><span class="currency-badge">{{ record.currency }}</span>
            <template v-if="record.kind === 'exchange' && record.received_amount">
              <bdi>+{{ formatMoney(record.received_amount) }}</bdi>
              <span class="currency-badge">{{ receivedCurrency(record.currency) }}</span>
            </template>
          </div>
          <div class="transaction-row-actions">
            <a v-if="record.debt" class="secondary-button" :href="`#/debts/${record.debt}`">{{
              debtCopy.manage
            }}</a>
            <template v-else>
              <button
                :id="`edit-transaction-${record.id}`"
                type="button"
                class="secondary-button"
                :disabled="busy"
                :aria-label="`${accountCopy.edit}: ${record.account_name}, ${record.amount} ${record.currency}`"
                @click="edit(record, record.kind, $event)"
              >
                {{ accountCopy.edit }}</button><button
                :id="`delete-transaction-${record.id}`"
                type="button"
                class="text-button"
                :disabled="busy"
                :aria-label="`${text.delete}: ${record.account_name}, ${record.amount} ${record.currency}`"
                @click="confirm(record, $event)"
              >
                {{ text.delete }}
              </button>
            </template>
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
      <p class="field-help activity-opening-note">{{ text.openingNote }}</p>
    </template>
  </section>
</template>
