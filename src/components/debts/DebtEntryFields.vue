<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { apiRequest } from '../../lib/api'
import { formatMoney, type MoneyAccount } from '../../lib/accounts'
import type { DebtEntryValues } from '../../lib/debts'
import { localDate, dateLabel } from '../../lib/transactions'
import { debtCopy as text } from '../../lib/debtCopy'
import { language } from '../../lib/preferences'
import AccountSelect from '../ui/AccountSelect.vue'
import FormField from '../ui/FormField.vue'

const model = defineModel<DebtEntryValues>({ required: true })
const props = defineProps<{
  withAccount: boolean
  currency: string
  amountLabel: string
  accountLabel?: string
  earliest?: string
  busy: boolean
  fields: Record<string, string[]>
}>()
const emit = defineEmits<{ ready: [value: boolean]; error: [cause: unknown] }>()
const account = computed({
  get: () => String(model.value.account ?? ''),
  set: (value) => {
    model.value.account = value ? Number(value) : null
  },
})
const context = ref<MoneyAccount | null>(null)
const loading = ref(false),
  failed = ref(false),
  choicesReady = ref(false)
const earliest = computed(() =>
  [props.earliest, props.withAccount ? context.value?.opening.effective_date : undefined]
    .filter((value): value is string => !!value)
    .sort()
    .at(-1),
)
const balance = computed(() =>
  props.currency && context.value
    ? formatMoney(props.currency === 'IQD' ? context.value.balance_iqd : context.value.balance_usd)
    : '',
)
let readId = 0
async function load(): Promise<void> {
  const read = ++readId
  context.value = null
  failed.value = false
  loading.value = props.withAccount && !!account.value
  if (!loading.value) return
  try {
    const result = await apiRequest<MoneyAccount>(`accounts/${account.value}/`)
    if (read === readId) context.value = result
  } catch (cause) {
    if (read === readId) {
      failed.value = true
      emit('error', cause)
    }
  } finally {
    if (read === readId) loading.value = false
  }
}
watch([account, () => props.withAccount], load, { immediate: true })
watch(
  [() => props.withAccount, loading, failed, choicesReady],
  () =>
    emit('ready', !props.withAccount || (!loading.value && !failed.value && choicesReady.value)),
  { immediate: true },
)
onBeforeUnmount(() => {
  readId++
})
function fieldError(field: string): string | undefined {
  return props.fields[field]?.length
    ? field === 'amount'
      ? text.value.amountError
      : text.value.invalid
    : undefined
}
</script>
<template>
  <div class="debt-entry-fields">
    <FormField
      v-if="withAccount"
      id="debt-account"
      :label="accountLabel ?? text.account"
      :error="fieldError('account')"
    >
      <template #default="{ describedBy, invalid }"
        ><AccountSelect
          id="debt-account"
          v-model="account"
          resource="accounts"
          :empty-label="text.chooseAccount"
          :disabled="busy"
          :invalid="invalid"
          :described-by="describedBy"
          @ready="choicesReady = $event"
          @error="emit('error', $event)"
      /></template>
    </FormField>
    <FormField id="debt-amount" :label="amountLabel" :error="fieldError('amount')">
      <template #default="{ describedBy, invalid }"
        ><input
          id="debt-amount"
          v-model="model.amount"
          type="text"
          inputmode="decimal"
          dir="ltr"
          maxlength="19"
          required
          autocomplete="off"
          :disabled="busy"
          :aria-invalid="invalid"
          :aria-describedby="describedBy"
      /></template>
    </FormField>
    <FormField id="debt-date" :label="text.date" :error="fieldError('date')">
      <template #default="{ describedBy, invalid }"
        ><input
          id="debt-date"
          v-model="model.date"
          type="date"
          dir="ltr"
          required
          :min="earliest"
          :max="localDate()"
          :disabled="busy"
          :aria-invalid="invalid"
          :aria-describedby="describedBy"
      /></template>
    </FormField>
    <div
      v-if="balance || earliest"
      class="transaction-account-context debt-field-context"
      aria-live="polite"
    >
      <p v-if="balance">
        {{ text.balance }}: <bdi>{{ balance }} {{ currency }}</bdi>
      </p>
      <p v-if="earliest">{{ text.earliest }}: {{ dateLabel(earliest, language) }}</p>
    </div>
    <button v-if="failed" type="button" class="text-button" :disabled="busy" @click="load">
      {{ text.retry }}
    </button>
    <FormField
      id="debt-note"
      class="debt-note-field"
      :label="text.note"
      :error="fieldError('note')"
    >
      <template #default="{ describedBy, invalid }">
        <textarea
          id="debt-note"
          v-model="model.note"
          maxlength="500"
          rows="3"
          dir="auto"
          :disabled="busy"
          :aria-invalid="invalid"
          :aria-describedby="describedBy"
        ></textarea>
      </template>
    </FormField>
  </div>
</template>
