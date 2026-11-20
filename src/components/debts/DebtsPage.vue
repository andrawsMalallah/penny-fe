<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { ApiError, apiRequest } from '../../lib/api'
import { formatMoney, type RecordPage } from '../../lib/accounts'
import {
  debtIdFromHash,
  getDebts,
  getRepayments,
  groupedDebts,
  type Debt,
  type DebtEntryValues,
  type DebtFilters as Filters,
  type DebtValues,
} from '../../lib/debts'
import { dateLabel, newRequestId, type MoneyTransaction } from '../../lib/transactions'
import { debtCopy as text } from '../../lib/debtCopy'
import { language } from '../../lib/preferences'
import { useAuthFeedback } from '../../lib/useAuthFeedback'
import DebtFilters from './DebtFilters.vue'
import BackButton from '../ui/BackButton.vue'
import RefreshButton from '../ui/RefreshButton.vue'
import PageControls from '../ui/PageControls.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

const DebtEditor = defineAsyncComponent(() => import('./DebtEditor.vue'))
const RepaymentEditor = defineAsyncComponent(() => import('./RepaymentEditor.vue'))
const emit = defineEmits<{ expired: [] }>()
const emptyFilters = (): Filters => ({ person: '', direction: '', currency: '', status: 'open' })
const filters = ref(emptyFilters()),
  applied = ref(emptyFilters())
const records = ref<RecordPage<Debt> | null>(null),
  payments = ref<RecordPage<MoneyTransaction> | null>(null)
const groups = computed(() => groupedDebts(records.value?.results ?? []))
const filtered = computed(
  () =>
    applied.value.person ||
    applied.value.direction ||
    applied.value.currency ||
    applied.value.status !== 'open',
)
const page = ref(1),
  paymentPage = ref(1),
  busy = ref(false)
const mode = ref<'list' | 'detail' | 'debt' | 'repayment' | 'confirmation'>('list')
const selected = ref<Debt | null>(null),
  editingDebt = ref<Debt | null>(null),
  editingPayment = ref<MoneyTransaction | null>(null)
const deletingPayment = ref<MoneyTransaction | null>(null)
const selectedId = ref<number | null>(null),
  notice = ref<'saved' | 'deleted' | ''>('')
const heading = ref<HTMLElement | null>(null),
  detailHeading = ref<HTMLElement | null>(null),
  confirmHeading = ref<HTMLElement | null>(null),
  errorSummary = ref<HTMLElement | null>(null)
const { error, fieldErrors, clearErrors, showError } = useAuthFeedback(errorSummary)
const conflict = ref(false)
let triggerId = '',
  requestId = ''
let pendingRoute = false,
  active = true
function routeChanged(): void {
  if (!/^#\/debts(?:\/[1-9]\d*)?$/.test(window.location.hash)) return
  if (busy.value) {
    pendingRoute = true
    return
  }
  const id = debtIdFromHash(window.location.hash)
  void perform(async () => {
    requestId = ''
    if (id) await fetchDetail(id)
    else {
      selectedId.value = null
      selected.value = null
      payments.value = null
      mode.value = 'list'
      await fetchList()
    }
  })
}
function clear(): void {
  clearErrors()
  conflict.value = false
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
async function perform(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  clear()
  notice.value = ''
  try {
    await action()
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
    if (pendingRoute && active) {
      pendingRoute = false
      routeChanged()
    }
  }
}
async function fetchList(value = 1): Promise<void> {
  records.value = null
  records.value = await getDebts(applied.value, value)
  page.value = value
}
async function fetchDetail(id: number, value = 1): Promise<void> {
  selectedId.value = id
  selected.value = null
  payments.value = null
  mode.value = 'detail'
  const [debt, repayments] = await Promise.all([
    apiRequest<Debt>(`debts/${id}/`),
    getRepayments(id, value),
  ])
  selected.value = debt
  payments.value = repayments
  paymentPage.value = value
  await nextTick()
  detailHeading.value?.focus()
}
async function load(value = 1): Promise<void> {
  await perform(async () => {
    if (mode.value === 'detail' && selectedId.value) await fetchDetail(selectedId.value, value)
    else await fetchList(value)
  })
}
async function applyFilters(reset = false): Promise<void> {
  if (reset) filters.value = emptyFilters()
  applied.value = { ...filters.value }
  await load()
}
function remember(event: Event): void {
  triggerId = (event.currentTarget as HTMLElement).id
}
async function openDebt(id: number, event: Event): Promise<void> {
  remember(event)
  await perform(() => fetchDetail(id))
}
async function editDebt(record: Debt | null, event: Event): Promise<void> {
  remember(event)
  await perform(async () => {
    editingDebt.value = record ? await apiRequest<Debt>(`debts/${record.id}/`) : null
    requestId = record ? '' : await newRequestId()
    mode.value = 'debt'
  })
}
async function editPayment(record: MoneyTransaction | null, event: Event): Promise<void> {
  if (!selected.value) return
  remember(event)
  await perform(async () => {
    selected.value = await apiRequest<Debt>(`debts/${selectedId.value}/`)
    editingPayment.value = record
      ? await apiRequest<MoneyTransaction>(`debts/${selectedId.value}/repayments/${record.id}/`)
      : null
    requestId = record ? '' : await newRequestId()
    mode.value = 'repayment'
  })
}
async function closeEditor(): Promise<void> {
  requestId = ''
  editingDebt.value = null
  editingPayment.value = null
  deletingPayment.value = null
  clear()
  mode.value = selectedId.value ? 'detail' : 'list'
  if (selectedId.value) await perform(() => fetchDetail(selectedId.value!))
  await nextTick()
  ;(document.getElementById(triggerId) ?? detailHeading.value ?? heading.value)?.focus()
}
async function back(): Promise<void> {
  if (mode.value !== 'detail') {
    await closeEditor()
    return
  }
  await perform(async () => {
    mode.value = 'list'
    selected.value = null
    selectedId.value = null
    payments.value = null
    if (debtIdFromHash(window.location.hash)) history.replaceState(null, '', '#/debts')
    await fetchList()
    await nextTick()
    ;(document.getElementById(triggerId) ?? heading.value)?.focus()
  })
}
async function saveDebt(values: DebtValues): Promise<void> {
  await perform(async () => {
    const debt = await apiRequest<Debt>(
      `debts/${editingDebt.value ? `${editingDebt.value.id}/` : ''}`,
      {
        ...values,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(editingDebt.value ? { version: editingDebt.value.version } : { request_id: requestId }),
      },
    )
    requestId = ''
    editingDebt.value = null
    await fetchDetail(debt.id)
    notice.value = 'saved'
  })
}
async function savePayment(values: DebtEntryValues): Promise<void> {
  await perform(async () => {
    await apiRequest(
      `debts/${selectedId.value}/repayments/${editingPayment.value ? `${editingPayment.value.id}/` : ''}`,
      {
        ...values,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(editingPayment.value
          ? { version: editingPayment.value.version }
          : { request_id: requestId }),
      },
    )
    requestId = ''
    editingPayment.value = null
    await fetchDetail(selectedId.value!)
    notice.value = 'saved'
  })
}
async function confirmDelete(payment: MoneyTransaction | null, event: Event): Promise<void> {
  remember(event)
  clear()
  notice.value = ''
  deletingPayment.value = payment
  mode.value = 'confirmation'
  await nextTick()
  confirmHeading.value?.focus()
}
async function remove(): Promise<void> {
  await perform(async () => {
    if (deletingPayment.value) {
      await apiRequest(`debts/${selectedId.value}/repayments/${deletingPayment.value.id}/delete/`, {
        version: deletingPayment.value.version,
      })
      deletingPayment.value = null
      await fetchDetail(selectedId.value!)
    } else {
      await apiRequest(`debts/${selectedId.value}/delete/`, { version: selected.value!.version })
      selected.value = null
      selectedId.value = null
      mode.value = 'list'
      await fetchList()
      await nextTick()
      heading.value?.focus()
    }
    notice.value = 'deleted'
  })
}
onMounted(async () => {
  window.addEventListener('hashchange', routeChanged)
  heading.value?.focus()
  const id = debtIdFromHash(window.location.hash)
  if (id) await perform(() => fetchDetail(id))
  else await load()
})
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('hashchange', routeChanged)
})
</script>
<template>
  <section class="debts-page" :aria-busy="busy" :aria-label="text.title">
    <div class="activity-page-heading page-heading">
      <div>
        <h1 ref="heading" tabindex="-1">{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton
        v-if="mode === 'list' || mode === 'detail'"
        :label="text.refresh"
        :busy="busy"
        icon-only
        @click="load()"
      />
    </div>
    <BackButton
      v-if="mode !== 'list'"
      :label="mode === 'detail' || !selectedId ? text.back : text.backDetail"
      :disabled="busy"
      @click="back"
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
    <DebtEditor
      v-if="mode === 'debt'"
      :item="editingDebt"
      :busy="busy"
      :fields="fieldErrors"
      @save="saveDebt"
      @cancel="closeEditor"
      @error="handleError"
    />
    <RepaymentEditor
      v-else-if="mode === 'repayment' && selected"
      :debt="selected"
      :item="editingPayment"
      :busy="busy"
      :fields="fieldErrors"
      @save="savePayment"
      @cancel="closeEditor"
      @error="handleError"
    />
    <section
      v-else-if="mode === 'confirmation' && selected"
      class="transaction-confirmation surface-panel"
    >
      <h2 ref="confirmHeading" tabindex="-1">
        {{ deletingPayment ? text.deleteRepayment : text.deleteDebt }}
      </h2>
      <p dir="auto">{{ selected.person_name }}</p>
      <p>
        <bdi
          >{{ formatMoney(deletingPayment?.amount ?? selected.amount) }}
          {{ selected.currency }}</bdi
        >
      </p>
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
          {{ text.cancel }}
        </button>
      </div>
    </section>
    <template v-else-if="mode === 'detail'">
      <p v-if="busy" role="status">{{ text.refresh }}</p>
      <button v-if="!selected && !busy" type="button" class="secondary-button" @click="load()">
        {{ text.retry }}
      </button>
      <template v-if="selected">
        <section class="debt-detail surface-panel">
          <h2 ref="detailHeading" tabindex="-1" dir="auto">{{ selected.person_name }}</h2>
          <p>{{ text[selected.direction] }} · {{ text[selected.origin] }}</p>
          <dl class="debt-amounts">
            <div>
              <dt>{{ text.original }}</dt>
              <dd>
                <bdi>{{ formatMoney(selected.amount) }} {{ selected.currency }}</bdi>
              </dd>
            </div>
            <div>
              <dt>{{ text.repaid }}</dt>
              <dd>
                <bdi>{{ formatMoney(selected.repaid) }} {{ selected.currency }}</bdi>
              </dd>
            </div>
            <div>
              <dt>{{ text.remaining }}</dt>
              <dd>
                <bdi>{{ formatMoney(selected.remaining) }} {{ selected.currency }}</bdi>
              </dd>
            </div>
          </dl>
          <p>{{ dateLabel(selected.date, language) }}</p>
          <p v-if="selected.account" dir="auto">{{ selected.account_name }}</p>
          <p v-if="selected.note" class="transaction-note" dir="auto">{{ selected.note }}</p>
          <p class="field-help">{{ text.cashHelp }}</p>
          <div class="debt-actions">
            <button
              id="add-repayment"
              type="button"
              class="primary-button"
              :disabled="busy || selected.remaining === '0.00'"
              @click="editPayment(null, $event)"
            >
              {{ text.repay }}</button><button
              id="edit-debt"
              type="button"
              class="secondary-button"
              :disabled="busy"
              @click="editDebt(selected, $event)"
            >
              {{ text.edit }}</button
            ><button
              id="delete-debt"
              type="button"
              class="text-button"
              :disabled="busy"
              @click="confirmDelete(null, $event)"
            >
              {{ text.delete }}
            </button>
          </div>
        </section>
        <section class="debt-repayments surface-panel">
          <h2>{{ text.repayments }}</h2>
          <p v-if="!payments?.count">{{ text.noRepayments }}</p>
          <ul v-if="payments?.count" class="debt-payment-list">
            <li v-for="payment in payments.results" :key="payment.id">
              <div>
                <strong
                  ><bdi>{{ formatMoney(payment.amount) }} {{ payment.currency }}</bdi></strong
                >
                <p dir="auto">{{ payment.account_name }}</p>
                <time :datetime="payment.date">{{ dateLabel(payment.date, language) }}</time>
                <p v-if="payment.note" class="transaction-note" dir="auto">{{ payment.note }}</p>
              </div>
              <div class="debt-actions">
                <button
                  :id="`edit-repayment-${payment.id}`"
                  type="button"
                  class="secondary-button"
                  :disabled="busy"
                  :aria-label="`${text.editRepayment}: ${payment.amount} ${payment.currency}`"
                  @click="editPayment(payment, $event)"
                >
                  {{ text.editRepayment }}</button><button
                  :id="`delete-repayment-${payment.id}`"
                  type="button"
                  class="text-button"
                  :disabled="busy"
                  :aria-label="`${text.delete}: ${payment.amount} ${payment.currency}`"
                  @click="confirmDelete(payment, $event)"
                >
                  {{ text.delete }}
                </button>
              </div>
            </li>
          </ul>
          <PageControls
            v-if="payments"
            :page="paymentPage"
            :next="!!payments.next"
            :previous="!!payments.previous"
            :busy="busy"
            @change="load"
          />
        </section>
      </template>
    </template>
    <template v-else-if="mode === 'list'">
      <div class="activity-add-actions">
        <button
          id="add-debt"
          type="button"
          class="primary-button compact-primary"
          :disabled="busy"
          @click="editDebt(null, $event)"
        >
          {{ text.add }}
        </button>
      </div>
      <p class="field-help">{{ text.cashHelp }}</p>
      <DebtFilters
        v-model="filters"
        :busy="busy"
        @apply="applyFilters()"
        @clear="applyFilters(true)"
        @error="handleError"
      />
      <p v-if="busy" role="status">{{ text.refresh }}</p>
      <button v-if="!records && !busy" type="button" class="secondary-button" @click="load()">
        {{ text.retry }}
      </button>
      <div v-if="records && !records.count" class="accounts-empty">
        <h2>{{ filtered ? text.noMatches : text.empty }}</h2>
        <p>{{ filtered ? text.filterHelp : text.emptyHelp }}</p>
      </div>
      <section
        v-for="[personName, debts] in groups"
        :key="personName"
        class="debt-person-group surface-panel"
      >
        <h2 dir="auto">{{ personName }}</h2>
        <ul class="debt-list">
          <li v-for="debt in debts" :key="debt.id" class="debt-row">
            <div>
              <h3>{{ text[debt.direction] }}</h3>
              <p>{{ text[debt.origin] }} · {{ dateLabel(debt.date, language) }}</p>
              <p v-if="debt.note" class="transaction-note" dir="auto">{{ debt.note }}</p>
            </div>
            <div class="debt-remaining">
              <span>{{ text.remaining }}</span><strong
                ><bdi>{{ formatMoney(debt.remaining) }} {{ debt.currency }}</bdi></strong
              ><span
                >{{ text.original }}:
                <bdi>{{ formatMoney(debt.amount) }} {{ debt.currency }}</bdi></span
              >
            </div>
            <button
              :id="`view-debt-${debt.id}`"
              type="button"
              class="secondary-button"
              :disabled="busy"
              :aria-label="`${text.details}: ${personName}, ${debt.amount} ${debt.currency}`"
              @click="openDebt(debt.id, $event)"
            >
              {{ text.details }}
            </button>
          </li>
        </ul>
      </section>
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
