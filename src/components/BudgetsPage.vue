<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { ApiError } from '../lib/api'
import type { RecordPage } from '../lib/accounts'
import { getBudgets, budgetActivityLink, type BudgetRow } from '../lib/budgets'
import { budgetCopy as text } from '../lib/budgetCopy'
import { categoryName } from '../lib/categories'
import { language } from '../lib/preferences'
import { localDate } from '../lib/transactions'
import { monthLabel } from '../lib/analytics'
import BudgetEditor from './BudgetEditor.vue'
import BudgetProgress from './BudgetProgress.vue'
import FormField from './FormField.vue'
import RefreshButton from './RefreshButton.vue'
import PageControls from './PageControls.vue'

const emit = defineEmits<{ expired: [] }>()
const month = ref(localDate().slice(0, 7)),
  applied = ref(month.value),
  attempted = ref(month.value)
const records = ref<RecordPage<BudgetRow> | null>(null),
  page = ref(1),
  attemptedPage = ref(1)
const busy = ref(false),
  error = ref(''),
  notice = ref(''),
  editing = ref(false),
  item = ref<BudgetRow | null>(null)
const heading = ref<HTMLElement | null>(null),
  feedback = ref<HTMLElement | null>(null),
  addButton = ref<HTMLButtonElement | null>(null)
let focusTarget: HTMLElement | null = null
function applyMonth(): void {
  notice.value = ''
  void load(month.value)
}
async function load(value = applied.value, number = 1): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  records.value = null
  attempted.value = value
  attemptedPage.value = number
  try {
    records.value = await getBudgets(value, number)
    applied.value = value
    page.value = number
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 403) {
      emit('expired')
      return
    }
    error.value = cause instanceof ApiError && cause.status === 400 ? 'invalid' : 'error'
    await nextTick()
    feedback.value?.focus()
  } finally {
    busy.value = false
  }
}
function open(row: BudgetRow | null, event?: Event): void {
  focusTarget = (event?.currentTarget as HTMLElement | null) ?? addButton.value
  item.value = row
  editing.value = true
  notice.value = ''
}
async function close(saved?: boolean): Promise<void> {
  editing.value = false
  item.value = null
  if (saved !== undefined) {
    notice.value = saved ? 'removed' : 'saved'
    await load()
  }
  await nextTick()
  if (focusTarget?.isConnected) focusTarget.focus()
  else addButton.value?.focus()
}
onMounted(async () => {
  heading.value?.focus()
  await load()
})
</script>
<template>
  <section class="budgets-page" :aria-label="text.title" :aria-busy="busy">
    <div class="page-heading">
      <div>
        <h1 ref="heading" tabindex="-1">{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <RefreshButton v-if="!editing" :label="text.refresh" :busy="busy" icon-only @click="load()" />
    </div>
    <BudgetEditor
      v-if="editing"
      :month="applied"
      :item="item"
      @cancel="close()"
      @saved="close"
      @expired="emit('expired')"
    />
    <template v-else>
      <p v-if="notice" class="notice" role="status">{{ text[notice as 'saved' | 'removed'] }}</p>
      <form class="surface-panel budget-toolbar" @submit.prevent="applyMonth">
        <FormField id="budget-month" :label="text.month"
          ><input
            id="budget-month"
            v-model="month"
            type="month"
            required
            min="0001-01"
            max="9999-12"
            :disabled="busy"
        /></FormField>
        <button type="submit" class="secondary-button" :disabled="busy">{{ text.apply }}</button>
      </form>
      <div v-if="error" ref="feedback" class="error-summary" role="alert" tabindex="-1">
        {{ text[error as 'error' | 'invalid'] }}
        <button
          type="button"
          class="text-button"
          :disabled="busy"
          @click="load(error === 'invalid' ? month : attempted, attemptedPage)"
        >
          {{ text.retry }}
        </button>
      </div>
      <p v-if="busy" role="status">{{ text.loading }}</p>
      <template v-if="records">
        <div class="panel-heading">
          <h2>{{ monthLabel(applied, language) }}</h2>
          <button ref="addButton" type="button" class="primary-button" @click="open(null, $event)">
            {{ text.add }}
          </button>
        </div>
        <p class="field-help">{{ text.repeatHelp }}</p>
        <p v-if="!records.count" class="surface-panel">{{ text.empty }}</p>
        <div class="budget-list">
          <article
            v-for="row in records.results"
            :key="row.category"
            class="surface-panel budget-card"
          >
            <div class="panel-heading">
              <div>
                <h3>{{ categoryName(row, language) }}</h3>
                <p class="field-help">
                  {{ row.recurring ? text.repeats : text.exception
                  }}<span v-if="row.archived"> · {{ text.archived }}</span>
                </p>
              </div>
              <button
                type="button"
                class="secondary-button"
                :aria-label="`${text.edit}: ${categoryName(row, language)}`"
                @click="open(row, $event)"
              >
                {{ text.edit }}
              </button>
            </div>
            <div class="budget-currencies">
              <template v-for="currency in ['IQD', 'USD'] as const" :key="currency"
                ><BudgetProgress
                  v-if="row[currency].limit"
                  :money="row[currency]"
                  :currency="currency"
                  ><a :href="budgetActivityLink(row, currency)">{{
                    text.activity
                  }}</a></BudgetProgress
                ></template
              >
            </div>
          </article>
        </div>
        <PageControls
          :page="page"
          :next="!!records.next"
          :previous="!!records.previous"
          :busy="busy"
          @change="load(applied, $event)"
        />
      </template>
    </template>
  </section>
</template>
