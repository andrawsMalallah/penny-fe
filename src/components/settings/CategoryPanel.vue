<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '../../lib/api'
import {
  categoryName,
  getCategoryPage,
  type CategoryValues,
  type ExpenseCategory,
} from '../../lib/categories'
import type { RecordPage } from '../../lib/accounts'
import { categoryCopy as text } from '../../lib/categoryCopy'
import { accountCopy } from '../../lib/accountCopy'
import { copy } from '../../lib/copy'
import { language } from '../../lib/preferences'
import { useAuthFeedback } from '../../lib/useAuthFeedback'
import BackButton from '../ui/BackButton.vue'
import RefreshButton from '../ui/RefreshButton.vue'
import PageControls from '../ui/PageControls.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

const CategoryEditor = defineAsyncComponent(() => import('./CategoryEditor.vue'))
const emit = defineEmits<{ expired: []; back: [] }>()
const records = ref<RecordPage<ExpenseCategory> | null>(null)
const archived = ref(false)
const page = ref(1)
const busy = ref(false)
const initialized = ref(false)
const editing = ref(false)
const item = ref<ExpenseCategory | null>(null)
const confirmation = ref<ExpenseCategory | null>(null)
const heading = ref<HTMLElement | null>(null)
const confirmHeading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const { error, fieldErrors, clearErrors, showError } = useAuthFeedback(errorSummary)
const notice = ref('')
let triggerId = ''

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
  await showError(cause)
}
async function fetchRecords(value = 1): Promise<void> {
  records.value = await getCategoryPage(value, archived.value)
  page.value = value
}
async function load(value = 1): Promise<void> {
  if (busy.value) return
  busy.value = true
  records.value = null
  notice.value = ''
  clearErrors()
  try {
    // Initialization is an explicit CSRF-protected POST; GETs never create records.
    if (!initialized.value) {
      await apiRequest('expense-categories/initialize/', {})
      initialized.value = true
    }
    await fetchRecords(value)
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function switchList(value: boolean): Promise<void> {
  if (busy.value) return
  archived.value = value
  await load()
}
function edit(record: ExpenseCategory | null, event: Event): void {
  triggerId = (event.currentTarget as HTMLElement).id
  item.value = record
  editing.value = true
  notice.value = ''
  clearErrors()
}
async function closeEditor(): Promise<void> {
  editing.value = false
  confirmation.value = null
  clearErrors()
  await nextTick()
  document.getElementById(triggerId)?.focus()
}
async function save(values: CategoryValues): Promise<void> {
  if (busy.value) return
  busy.value = true
  clearErrors()
  try {
    await apiRequest(`expense-categories/${item.value ? `${item.value.id}/` : ''}`, values)
    editing.value = false
    records.value = null
    notice.value = accountCopy.value.saved
    await fetchRecords()
    await nextTick()
    heading.value?.focus()
  } catch (cause) {
    await handleError(cause)
  } finally {
    busy.value = false
  }
}
async function confirm(record: ExpenseCategory, event: Event): Promise<void> {
  triggerId = (event.currentTarget as HTMLElement).id
  confirmation.value = record
  notice.value = ''
  clearErrors()
  await nextTick()
  confirmHeading.value?.focus()
}
async function archive(): Promise<void> {
  if (busy.value || !confirmation.value) return
  busy.value = true
  clearErrors()
  try {
    const restoring = confirmation.value.archived
    await apiRequest(`expense-categories/${confirmation.value.id}/archive/`, {
      archived: !restoring,
    })
    confirmation.value = null
    records.value = null
    notice.value = restoring ? text.value.restoredNotice : text.value.archivedNotice
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
</script>

<template>
  <section class="category-panel" :aria-busy="busy" :aria-label="text.title">
    <BackButton :disabled="busy" :label="copy.backToSettings" @click="emit('back')" />
    <div class="category-heading">
      <h2 ref="heading" tabindex="-1">{{ text.title }}</h2>
      <RefreshButton
        v-if="!editing && !confirmation"
        :label="text.refresh"
        :busy="busy"
        icon-only
        @click="load()"
      />
    </div>
    <p v-if="!editing && !confirmation" class="field-help">{{ text.intro }}</p>
    <div v-if="error" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
      {{ error }}
    </div>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <CategoryEditor
      v-if="editing"
      :item="item"
      :busy="busy"
      :fields="fieldErrors"
      @save="save"
      @cancel="closeEditor"
    />
    <section
      v-else-if="confirmation"
      class="category-confirmation"
      aria-labelledby="category-confirm-title"
    >
      <h3 id="category-confirm-title" ref="confirmHeading" tabindex="-1">
        {{ confirmation.archived ? text.restoreTitle : text.archiveTitle }}
      </h3>
      <p class="confirmation-name" dir="auto">{{ categoryName(confirmation, language) }}</p>
      <p class="field-help">{{ confirmation.archived ? text.restoreHelp : text.archiveHelp }}</p>
      <div class="form-actions">
        <PrimaryButton type="button" :busy="busy" @click="archive">{{
          confirmation.archived ? accountCopy.restore : accountCopy.archive
        }}</PrimaryButton>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeEditor">
          {{ accountCopy.cancel }}
        </button>
      </div>
    </section>
    <template v-else>
      <div class="category-toolbar">
        <div class="account-filter-options" :aria-label="text.title">
          <button
            type="button"
            :aria-pressed="!archived"
            :disabled="busy"
            @click="switchList(false)"
          >
            {{ accountCopy.active }}
          </button>
          <button type="button" :aria-pressed="archived" :disabled="busy" @click="switchList(true)">
            {{ accountCopy.archived }}
          </button>
        </div>
        <button
          v-if="!archived && records"
          id="add-category"
          type="button"
          class="primary-button compact-primary"
          :disabled="busy"
          @click="edit(null, $event)"
        >
          {{ text.add }}
        </button>
      </div>
      <p v-if="busy" role="status">{{ accountCopy.loading }}</p>
      <button v-if="!records && !busy" type="button" class="secondary-button" @click="load()">
        {{ accountCopy.retry }}
      </button>
      <div v-if="records && !records.count" class="accounts-empty">
        <h3>{{ archived ? text.noArchived : text.empty }}</h3>
        <p>{{ archived ? text.noArchivedHelp : text.emptyHelp }}</p>
      </div>
      <ul v-if="records?.count" class="category-list">
        <li v-for="record in records.results" :key="record.id" class="category-row">
          <span class="category-name" dir="auto">{{ categoryName(record, language) }}</span>
          <div class="category-actions">
            <button
              v-if="!record.archived"
              :id="`edit-category-${record.id}`"
              type="button"
              class="secondary-button"
              :disabled="busy"
              :aria-label="`${accountCopy.edit}: ${categoryName(record, language)}`"
              @click="edit(record, $event)"
            >
              {{ accountCopy.edit }}
            </button>
            <button
              :id="`archive-category-${record.id}`"
              type="button"
              class="text-button"
              :disabled="busy"
              :aria-label="`${record.archived ? accountCopy.restore : accountCopy.archive}: ${categoryName(record, language)}`"
              @click="confirm(record, $event)"
            >
              {{ record.archived ? accountCopy.restore : accountCopy.archive }}
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
