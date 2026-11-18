<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ApiError, apiRequest, type User } from '../lib/api'
import { getBudget, saveBudget, type BudgetRow, type BudgetValues } from '../lib/budgets'
import { budgetCopy as text } from '../lib/budgetCopy'
import { categoryName } from '../lib/categories'
import { language } from '../lib/preferences'
import { monthLabel } from '../lib/analytics'
import FormField from './FormField.vue'
import AccountSelect from './AccountSelect.vue'
import SelectControl from './SelectControl.vue'
import BackButton from './BackButton.vue'

const props = defineProps<{ month: string; item: BudgetRow | null }>()
const emit = defineEmits<{ cancel: []; saved: [removed: boolean]; expired: [] }>()
const category = ref(props.item ? String(props.item.category) : '')
const current = ref<BudgetRow | null>(props.item)
const limits = ref({ IQD: props.item?.IQD.limit ?? '', USD: props.item?.USD.limit ?? '' })
const scope = ref<BudgetValues['scope']>(props.item ? 'month' : 'future')
const busy = ref(false),
  choicesReady = ref(!!props.item),
  blocked = ref(false),
  confirming = ref(false)
const error = ref(''),
  fields = ref<Record<string, string[]>>({})
const heading = ref<HTMLElement | null>(null),
  feedback = ref<HTMLElement | null>(null),
  removeButton = ref<HTMLButtonElement | null>(null)
let readSequence = 0
const ready = computed(() => !!current.value && choicesReady.value && !busy.value && !blocked.value)
async function fail(cause: unknown, saving = false): Promise<void> {
  fields.value = cause instanceof ApiError ? cause.fields : {}
  if (cause instanceof ApiError && cause.status === 403) {
    try {
      await apiRequest<User>('auth/me/')
    } catch {
      emit('expired')
      return
    }
  }
  error.value =
    cause instanceof ApiError && cause.status === 409
      ? 'conflict'
      : cause instanceof ApiError && cause.status === 400
        ? 'invalid'
        : saving
          ? 'saveError'
          : 'error'
  // Ambiguous mutation failures require a fresh read; never replay a write.
  if (saving && error.value !== 'invalid') blocked.value = true
  await nextTick()
  feedback.value?.focus()
}
async function load(): Promise<void> {
  const sequence = ++readSequence
  current.value = null
  error.value = ''
  fields.value = {}
  limits.value = { IQD: '', USD: '' }
  if (!category.value) return
  busy.value = true
  try {
    const result = await getBudget(Number(category.value), props.month)
    if (sequence !== readSequence) return
    current.value = result
    limits.value = { IQD: result.IQD.limit ?? '', USD: result.USD.limit ?? '' }
    scope.value = result.IQD.limit || result.USD.limit ? 'month' : 'future'
  } catch (cause) {
    if (sequence === readSequence) await fail(cause)
  } finally {
    if (sequence === readSequence) busy.value = false
  }
}
watch(category, load)
async function submit(remove = false): Promise<void> {
  if (!ready.value) return
  if (!remove && !limits.value.IQD.trim() && !limits.value.USD.trim()) {
    error.value = 'required'
    await nextTick()
    feedback.value?.focus()
    return
  }
  busy.value = true
  error.value = ''
  fields.value = {}
  try {
    await saveBudget(Number(category.value), {
      month: props.month,
      version: current.value!.version,
      scope: scope.value,
      limit_iqd: remove ? null : limits.value.IQD.trim() || null,
      limit_usd: remove ? null : limits.value.USD.trim() || null,
    })
    emit('saved', remove)
  } catch (cause) {
    await fail(cause, true)
  } finally {
    busy.value = false
  }
}
async function cancelRemoval(): Promise<void> {
  confirming.value = false
  await nextTick()
  removeButton.value?.focus()
}
onMounted(() => heading.value?.focus())
</script>
<template>
  <section class="surface-panel budget-editor" :aria-busy="busy">
    <BackButton :label="text.cancel" :disabled="busy" @click="emit('cancel')" />
    <h2 ref="heading" tabindex="-1">{{ item ? text.edit : text.add }}</h2>
    <p>{{ monthLabel(month, language) }}</p>
    <div v-if="error" ref="feedback" class="error-summary" role="alert" tabindex="-1">
      {{ text[error as keyof typeof text] }}
      <button
        v-if="!current && category && !blocked"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="load"
      >
        {{ text.retry }}
      </button>
    </div>
    <form @submit.prevent="submit()">
      <p v-if="item">
        <strong>{{ categoryName(item, language) }}</strong>
      </p>
      <FormField v-else id="budget-category" :label="text.category">
        <AccountSelect
          id="budget-category"
          v-model="category"
          resource="expense-categories"
          :empty-label="text.choose"
          :disabled="busy || blocked"
          @ready="choicesReady = $event"
          @error="fail($event)"
        />
      </FormField>
      <fieldset class="opening-fields" :disabled="!ready || confirming">
        <legend>{{ text.limit }}</legend>
        <div class="money-inputs">
          <FormField
            v-for="currency in ['IQD', 'USD'] as const"
            :id="`budget-${currency}`"
            :key="currency"
            :label="currency"
            :help="text.optional"
            :error="fields[currency === 'IQD' ? 'limit_iqd' : 'limit_usd'] ? text.invalid : ''"
          >
            <template #default="{ describedBy, invalid }"
              ><input
                :id="`budget-${currency}`"
                v-model="limits[currency]"
                type="text"
                inputmode="decimal"
                dir="ltr"
                maxlength="19"
                autocomplete="off"
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
            /></template>
          </FormField>
        </div>
      </fieldset>
      <FormField id="budget-scope" :label="text.scope" :help="text.scopeHelp">
        <template #default="{ describedBy }"
          ><SelectControl
            id="budget-scope"
            v-model="scope"
            :disabled="!ready || confirming"
            :described-by="describedBy"
            ><option value="month">{{ text.monthOnly }}</option>
            <option value="future">{{ text.future }}</option></SelectControl
          ></template
        >
      </FormField>
      <div v-if="confirming" class="notice" role="alert">
        <p>{{ text.removeHelp }}</p>
        <p>
          <strong>{{ scope === 'future' ? text.future : text.monthOnly }}</strong>
        </p>
        <div class="form-actions">
          <button
            type="button"
            class="secondary-button budget-confirm-remove"
            :disabled="!ready"
            @click="submit(true)"
          >
            {{ text.confirm }}</button><button
            type="button"
            class="secondary-button"
            :disabled="busy"
            @click="cancelRemoval"
          >
            {{ text.cancel }}
          </button>
        </div>
      </div>
      <div v-else class="form-actions">
        <button type="submit" class="primary-button" :disabled="!ready">
          {{ text.save }}</button><button
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="emit('cancel')"
        >
          {{ text.cancel }}
        </button>
      </div>
      <button
        v-if="current?.IQD.limit || current?.USD.limit"
        v-show="!confirming"
        ref="removeButton"
        type="button"
        class="text-button budget-remove"
        :disabled="!ready"
        @click="confirming = true"
      >
        {{ text.remove }}
      </button>
    </form>
  </section>
</template>
