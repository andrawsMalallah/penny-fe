<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, type UserSettings } from '../lib/api'
import { formatMoney, type RecordPage } from '../lib/accounts'
import { dateLabel, newRequestId, type TransactionValues } from '../lib/transactions'
import { language } from '../lib/preferences'
import { recurringCopy as text } from '../lib/recurringCopy'
import {
  changeScheduleState,
  getPending,
  getSchedules,
  getSchedule,
  resolveOccurrence,
  saveSchedule,
  scheduleTransaction,
  type PendingPage,
  type RecurringSchedule,
  type ScheduleState,
  type ScheduleValues,
} from '../lib/recurring'
import PageControls from './PageControls.vue'
import RefreshButton from './RefreshButton.vue'
import BackButton from './BackButton.vue'
import FormField from './FormField.vue'
import SelectControl from './SelectControl.vue'
const RecurringEditor = defineAsyncComponent(() => import('./RecurringEditor.vue'))
const TransactionEditor = defineAsyncComponent(() => import('./TransactionEditor.vue'))
const emit = defineEmits<{ expired: []; busy: [busy: boolean] }>()
const mode = ref<'list' | 'pending' | 'edit' | 'record' | 'action'>('list')
const records = ref<RecordPage<RecurringSchedule> | null>(null),
  selection = ref<RecurringSchedule | null>(null),
  due = ref<PendingPage | null>(null)
const busy = ref(false),
  blocked = ref(false),
  error = ref<'error' | 'invalid' | 'conflict' | ''>(''),
  fields = ref<Record<string, string[]>>({}),
  notice = ref('')
const stateFilter = ref('all'),
  appliedState = ref('all'),
  page = ref(1),
  pendingIndex = ref(0),
  cursors = ref([''])
const selectedDate = ref(''),
  action = ref<ScheduleState | 'skip'>('paused')
const actionOrigin = ref<'list' | 'pending'>('list')
const attemptedPage = ref(1),
  attemptedIndex = ref(0)
let listTriggerId = ''
const heading = ref<HTMLElement | null>(null),
  feedback = ref<HTMLElement | null>(null)
const initialTransaction = ref<TransactionValues | undefined>()
const defaults: UserSettings = {
  language: 'en',
  default_account: null,
  default_currency: '',
  exchange_rate: null,
}
let requestId = '',
  trigger: HTMLElement | null = null
const actionHelp = computed(() =>
  action.value === 'skip'
    ? text.value.skipHelp
    : action.value === 'paused'
      ? text.value.pauseHelp
      : action.value === 'active'
        ? text.value.resumeHelp
        : text.value.stopHelp,
)
function setBusy(value: boolean): void {
  busy.value = value
  emit('busy', value)
}
function clear(): void {
  error.value = ''
  fields.value = {}
  blocked.value = false
}
async function fail(cause: unknown, mutation = false): Promise<void> {
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
  fields.value = cause instanceof ApiError ? cause.fields : {}
  error.value =
    cause instanceof ApiError && cause.status === 409
      ? 'conflict'
      : cause instanceof ApiError && cause.status === 400
        ? 'invalid'
        : 'error'
  if (mutation && error.value !== 'invalid') blocked.value = true
  await nextTick()
  feedback.value?.focus()
}
async function loadList(number = 1): Promise<void> {
  if (busy.value) return
  attemptedPage.value = number
  setBusy(true)
  clear()
  records.value = null
  try {
    records.value = await getSchedules(number, appliedState.value)
    page.value = number
  } catch (cause) {
    await fail(cause)
  } finally {
    setBusy(false)
  }
}
async function loadPending(index = 0): Promise<void> {
  if (busy.value || !selection.value) return
  attemptedIndex.value = index
  setBusy(true)
  clear()
  due.value = null
  try {
    const result = await getPending(selection.value.id, cursors.value[index] ?? '')
    due.value = result
    selection.value = result.schedule
    pendingIndex.value = index
    cursors.value = cursors.value.slice(0, index + 1)
    if (result.next_cursor) cursors.value[index + 1] = result.next_cursor
  } catch (cause) {
    await fail(cause)
  } finally {
    setBusy(false)
  }
}
async function focusHeading(): Promise<void> {
  await nextTick()
  heading.value?.focus()
}
async function review(row: RecurringSchedule, event: Event): Promise<void> {
  trigger = event.currentTarget as HTMLElement
  listTriggerId = trigger.id
  selection.value = row
  mode.value = 'pending'
  notice.value = ''
  cursors.value = ['']
  await loadPending()
  await focusHeading()
}
async function edit(row: RecurringSchedule | null, event: Event): Promise<void> {
  if (busy.value) return
  trigger = event.currentTarget as HTMLElement
  setBusy(true)
  clear()
  notice.value = ''
  try {
    await apiRequest('expense-categories/initialize/', {})
    selection.value = row ? await getSchedule(row.id) : null
    requestId = row ? '' : await newRequestId()
    mode.value = 'edit'
  } catch (cause) {
    await fail(cause)
  } finally {
    setBusy(false)
  }
}
async function save(values: ScheduleValues): Promise<void> {
  if (busy.value || blocked.value) return
  setBusy(true)
  error.value = ''
  fields.value = {}
  try {
    await saveSchedule(
      values,
      selection.value?.id ?? null,
      selection.value ? { version: selection.value.version } : { request_id: requestId },
    )
    mode.value = 'list'
    selection.value = null
    requestId = ''
    notice.value = 'saved'
  } catch (cause) {
    await fail(cause, true)
  } finally {
    setBusy(false)
  }
  if (mode.value === 'list') {
    await loadList()
    await focusHeading()
  }
}
async function back(): Promise<void> {
  if (busy.value) return
  const previous = mode.value
  clear()
  notice.value = ''
  requestId = ''
  if (
    (previous === 'record' || (previous === 'action' && actionOrigin.value === 'pending')) &&
    selection.value
  ) {
    mode.value = 'pending'
    await loadPending()
  } else {
    mode.value = 'list'
    selection.value = null
    due.value = null
    await loadList(page.value)
  }
  await nextTick()
  const restored = document.getElementById(
    previous === 'pending' ? listTriggerId : (trigger?.id ?? ''),
  )
  if (restored) restored.focus()
  else heading.value?.focus()
}
async function ask(
  row: RecurringSchedule,
  target: ScheduleState | 'skip',
  event: Event,
  date = '',
): Promise<void> {
  if (busy.value) return
  trigger = event.currentTarget as HTMLElement
  actionOrigin.value = mode.value === 'list' ? 'list' : 'pending'
  selection.value = row
  action.value = target
  selectedDate.value = date
  mode.value = 'action'
  clear()
  notice.value = ''
  await focusHeading()
}
async function record(date: string, event: Event): Promise<void> {
  if (!selection.value || busy.value) return
  trigger = event.currentTarget as HTMLElement
  selectedDate.value = date
  initialTransaction.value = scheduleTransaction(selection.value)
  mode.value = 'record'
  clear()
  notice.value = ''
}
async function mutate(transaction?: TransactionValues): Promise<void> {
  if (!selection.value || busy.value || blocked.value) return
  setBusy(true)
  error.value = ''
  fields.value = {}
  let succeeded = false
  try {
    if (transaction || action.value === 'skip') {
      await resolveOccurrence(selection.value, selectedDate.value, transaction)
      notice.value = transaction ? 'recorded' : 'skipped'
    } else {
      selection.value = await changeScheduleState(selection.value, action.value as ScheduleState)
      notice.value = 'changed'
    }
    succeeded = true
    mode.value = 'pending'
    cursors.value = ['']
  } catch (cause) {
    await fail(cause, true)
  } finally {
    setBusy(false)
  }
  if (succeeded) {
    await loadPending()
    await focusHeading()
  }
}
async function apply(): Promise<void> {
  appliedState.value = stateFilter.value
  await loadList()
}
onMounted(async () => {
  await loadList()
  await focusHeading()
})
</script>
<template>
  <section class="recurring-panel" :aria-label="text.title" :aria-busy="busy">
    <div class="panel-heading">
      <div>
        <h2 ref="heading" tabindex="-1">
          {{ mode === 'list' ? text.title : (selection?.name ?? text.add) }}
        </h2>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton
        v-if="mode === 'list' || mode === 'pending'"
        :label="text.refresh"
        :busy="busy"
        icon-only
        @click="mode === 'list' ? loadList(page) : loadPending(pendingIndex)"
      />
    </div>
    <BackButton
      v-if="mode !== 'list'"
      :label="mode === 'pending' || mode === 'edit' ? text.back : text.cancel"
      :disabled="busy"
      @click="back"
    />
    <div v-if="error" ref="feedback" class="error-summary" role="alert" tabindex="-1">
      {{ text[error]
      }}<button
        v-if="mode === 'list' || mode === 'pending'"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="mode === 'list' ? loadList(attemptedPage) : loadPending(attemptedIndex)"
      >
        {{ text.retry }}
      </button>
    </div>
    <p v-if="notice" class="notice" role="status">
      {{ text[notice as 'saved' | 'recorded' | 'skipped' | 'changed'] }}
    </p>
    <p v-if="busy" role="status">{{ text.loading }}</p>
    <RecurringEditor
      v-if="mode === 'edit'"
      :item="selection"
      :busy="busy"
      :blocked="blocked"
      :fields="fields"
      @save="save"
      @cancel="back"
      @error="fail($event)"
    />
    <template v-else-if="mode === 'record' && selection">
      <p class="field-help">
        {{ text.due }}: {{ dateLabel(selectedDate, language) }}. {{ text.settledHelp }}
      </p>
      <p v-if="selection.account_archived || selection.category_archived" class="notice">
        {{ text.archived }}
      </p>
      <TransactionEditor
        :item="null"
        :kind="selection.kind"
        :defaults="defaults"
        :initial-values="initialTransaction"
        ordinary-only
        :heading-label="text.confirm"
        :submit-label="text.record"
        :busy="busy"
        :save-disabled="blocked"
        :fields="fields"
        @save="mutate"
        @cancel="back"
        @error="fail($event)"
      />
    </template>
    <section v-else-if="mode === 'action' && selection" class="surface-panel recurring-action">
      <h3>
        {{
          action === 'skip'
            ? text.skip
            : text[action === 'paused' ? 'pause' : action === 'active' ? 'resume' : 'stop']
        }}
      </h3>
      <p>{{ actionHelp }}</p>
      <p v-if="selectedDate">{{ dateLabel(selectedDate, language) }}</p>
      <div class="form-actions">
        <button type="button" class="primary-button" :disabled="busy || blocked" @click="mutate()">
          {{ text.confirmAction }}</button><button
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="back"
        >
          {{ text.cancel }}
        </button>
      </div>
    </section>
    <template v-else-if="mode === 'pending' && selection && due">
      <p class="recurring-state">
        {{ text[selection.state] }} · {{ text[selection.frequency] }} ·
        <bdi>{{ formatMoney(selection.amount) }} {{ selection.currency }}</bdi>
      </p>
      <h3>{{ text.pending }}</h3>
      <p v-if="!due.results.length" class="surface-panel">{{ text.noPending }}</p>
      <ul class="recurring-list">
        <li v-for="date in due.results" :key="date" class="surface-panel recurring-slot">
          <p>
            {{ text.due }}: <strong>{{ dateLabel(date, language) }}</strong>
          </p>
          <div class="recurring-actions">
            <button
              :id="`recurring-confirm-${date}`"
              type="button"
              class="secondary-button"
              :disabled="busy"
              @click="record(date, $event)"
            >
              {{ text.confirm }}</button><button
              :id="`recurring-skip-${date}`"
              type="button"
              class="text-button"
              :disabled="busy"
              @click="ask(selection, 'skip', $event, date)"
            >
              {{ text.skip }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="pendingIndex || due.next_cursor" class="page-controls">
        <button
          type="button"
          class="secondary-button"
          :disabled="busy || !pendingIndex"
          @click="loadPending(pendingIndex - 1)"
        >
          {{ text.previous }}</button><button
          type="button"
          class="secondary-button"
          :disabled="busy || !due.next_cursor"
          @click="loadPending(pendingIndex + 1)"
        >
          {{ text.next }}
        </button>
      </div>
    </template>
    <template v-else-if="mode === 'list'">
      <form class="recurring-toolbar" @submit.prevent="apply">
        <FormField id="recurring-state" :label="text.filter"
          ><SelectControl id="recurring-state" v-model="stateFilter" :disabled="busy"
            ><option value="all">{{ text.all }}</option>
            <option
              v-for="state in ['active', 'paused', 'stopped'] as const"
              :key="state"
              :value="state"
            >
              {{ text[state] }}
            </option></SelectControl
          ></FormField
        ><button type="submit" class="secondary-button" :disabled="busy">{{ text.apply }}</button
        ><button
          id="add-recurring"
          type="button"
          class="primary-button compact-primary"
          :disabled="busy"
          @click="edit(null, $event)"
        >
          {{ text.add }}
        </button>
      </form>
      <p v-if="records && !records.count" class="surface-panel">{{ text.empty }}</p>
      <ul class="recurring-list">
        <li
          v-for="row in records?.results ?? []"
          :key="row.id"
          class="surface-panel recurring-card"
        >
          <div class="panel-heading">
            <h3 dir="auto">{{ row.name }}</h3>
            <span>{{ text[row.state] }}</span>
          </div>
          <p>
            <bdi>{{ formatMoney(row.amount) }} {{ row.currency }}</bdi> · {{ text[row.frequency] }}
          </p>
          <p dir="auto">{{ row.account_name }}</p>
          <p class="field-help">
            {{ text.start }}: {{ dateLabel(row.start_date, language)
            }}<template v-if="row.end_date">
              · {{ text.end }}: {{ dateLabel(row.end_date, language) }}</template
            >
          </p>
          <div class="recurring-actions">
            <button
              :id="`recurring-review-${row.id}`"
              type="button"
              class="secondary-button"
              :disabled="busy"
              @click="review(row, $event)"
            >
              {{ text.review }}</button><button
              v-if="row.state !== 'stopped'"
              :id="`recurring-edit-${row.id}`"
              type="button"
              class="secondary-button"
              :disabled="busy"
              @click="edit(row, $event)"
            >
              {{ text.edit }}</button
            ><button
              v-if="row.state !== 'stopped'"
              :id="`recurring-state-${row.id}`"
              type="button"
              class="text-button"
              :disabled="busy"
              @click="ask(row, row.state === 'active' ? 'paused' : 'active', $event)"
            >
              {{ row.state === 'active' ? text.pause : text.resume }}</button
            ><button
              v-if="row.state !== 'stopped'"
              :id="`recurring-stop-${row.id}`"
              type="button"
              class="text-button recurring-stop"
              :disabled="busy"
              @click="ask(row, 'stopped', $event)"
            >
              {{ text.stop }}
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
        @change="loadList"
      />
    </template>
  </section>
</template>
