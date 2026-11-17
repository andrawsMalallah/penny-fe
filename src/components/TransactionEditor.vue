<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { apiRequest, type UserSettings } from '../lib/api'
import type { MoneyAccount } from '../lib/accounts'
import { formatMoney } from '../lib/accounts'
import { activityCopy as text } from '../lib/activityCopy'
import { accountCopy } from '../lib/accountCopy'
import {
  dateLabel,
  localDate,
  type MoneyTransaction,
  type TransactionKind,
  type TransactionValues,
} from '../lib/transactions'
import { language } from '../lib/preferences'
import AccountSelect from './AccountSelect.vue'
import SelectControl from './SelectControl.vue'
import FormField from './FormField.vue'
import PrimaryButton from './PrimaryButton.vue'

const props = defineProps<{
  item: MoneyTransaction | null
  kind: TransactionKind
  defaults: UserSettings
  busy: boolean
  fields: Record<string, string[]>
}>()
const emit = defineEmits<{
  save: [values: TransactionValues]
  cancel: []
  error: [cause: unknown]
}>()
const kind = ref(props.item?.kind ?? props.kind)
const account = ref(
  String(
    props.item?.account ?? (props.kind === 'expense' ? (props.defaults.default_account ?? '') : ''),
  ),
)
const currency = ref(
  props.item?.currency ?? (props.kind === 'expense' ? props.defaults.default_currency : ''),
)
const category = ref(String(props.item?.category ?? ''))
const amount = ref(props.item?.amount ?? '')
const date = ref(props.item?.date ?? localDate())
const note = ref(props.item?.note ?? '')
const currentAccount = ref<MoneyAccount | null>(null)
const loadingAccount = ref(false)
const accountFailed = ref(false)
const accountChoicesReady = ref(false)
const categoryChoicesReady = ref(false)
const heading = ref<HTMLElement | null>(null)
const earliest = computed(
  () => currentAccount.value?.opening.effective_date ?? props.item?.opening_date,
)
const currentBalance = computed(() =>
  currency.value && currentAccount.value
    ? formatMoney(
        currency.value === 'IQD'
          ? currentAccount.value.balance_iqd
          : currentAccount.value.balance_usd,
      )
    : '',
)
let accountRead = 0
async function loadAccount(value: string): Promise<void> {
  const read = ++accountRead
  currentAccount.value = null
  accountFailed.value = false
  if (!value) {
    loadingAccount.value = false
    return
  }
  loadingAccount.value = true
  try {
    const result = await apiRequest<MoneyAccount>(`accounts/${value}/`)
    if (read === accountRead) currentAccount.value = result
  } catch (cause) {
    if (read === accountRead) {
      accountFailed.value = true
      emit('error', cause)
    }
  } finally {
    if (read === accountRead) loadingAccount.value = false
  }
}
watch(account, loadAccount, { immediate: true })
watch(kind, (value) => {
  if (value === 'income') category.value = ''
  else {
    if (!account.value && props.defaults.default_account)
      account.value = String(props.defaults.default_account)
    if (!currency.value) currency.value = props.defaults.default_currency
  }
})
function fieldError(field: string): string | undefined {
  return props.fields[field]?.length
    ? field === 'amount'
      ? text.value.amountError
      : text.value.invalidField
    : undefined
}
function save(): void {
  if (
    props.busy ||
    loadingAccount.value ||
    accountFailed.value ||
    !accountChoicesReady.value ||
    (kind.value === 'expense' && !categoryChoicesReady.value)
  )
    return
  emit('save', {
    kind: kind.value,
    account: account.value ? Number(account.value) : null,
    currency: currency.value,
    category: kind.value === 'expense' && category.value ? Number(category.value) : null,
    amount: amount.value.trim(),
    date: date.value,
    note: note.value.trim(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}
onMounted(() => heading.value?.focus())
onBeforeUnmount(() => {
  accountRead++
})
</script>

<template>
  <section class="transaction-editor surface-panel" aria-labelledby="transaction-editor-title">
    <h2 id="transaction-editor-title" ref="heading" tabindex="-1">
      {{ item ? text.edit : kind === 'income' ? text.addIncome : text.addExpense }}
    </h2>
    <p class="field-help">{{ text.historicalHelp }}</p>
    <form @submit.prevent="save">
      <div class="transaction-fields">
        <FormField id="transaction-kind" :label="text.kind" :error="fieldError('kind')">
          <template #default="{ describedBy, invalid }"
            ><SelectControl
              id="transaction-kind"
              v-model="kind"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              ><option value="income">{{ text.income }}</option>
              <option value="expense">{{ text.expense }}</option></SelectControl
            ></template
          >
        </FormField>
        <FormField id="transaction-account" :label="text.account" :error="fieldError('account')">
          <template #default="{ describedBy, invalid }"
            ><AccountSelect
              id="transaction-account"
              v-model="account"
              resource="accounts"
              :empty-label="text.chooseAccount"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              @error="emit('error', $event)"
              @ready="accountChoicesReady = $event"
          /></template>
        </FormField>
        <FormField id="transaction-currency" :label="text.currency" :error="fieldError('currency')">
          <template #default="{ describedBy, invalid }"
            ><SelectControl
              id="transaction-currency"
              v-model="currency"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              ><option value="">{{ text.chooseCurrency }}</option>
              <option value="IQD">IQD</option>
              <option value="USD">USD</option></SelectControl
            ></template
          >
        </FormField>
        <FormField id="transaction-amount" :label="text.amount" :error="fieldError('amount')">
          <template #default="{ describedBy, invalid }"
            ><input
              id="transaction-amount"
              v-model="amount"
              type="text"
              inputmode="decimal"
              dir="ltr"
              maxlength="19"
              autocomplete="off"
              required
              :disabled="busy"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
          /></template>
        </FormField>
        <FormField
          v-if="kind === 'expense'"
          id="transaction-category"
          :label="text.category"
          :error="fieldError('category')"
        >
          <template #default="{ describedBy, invalid }"
            ><AccountSelect
              id="transaction-category"
              v-model="category"
              resource="expense-categories"
              :empty-label="text.chooseCategory"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              @error="emit('error', $event)"
              @ready="categoryChoicesReady = $event"
          /></template>
        </FormField>
        <FormField
          id="transaction-date"
          :label="text.date"
          :error="fieldError('date')"
          :help="text.dateHelp"
        >
          <template #default="{ describedBy, invalid }"
            ><input
              id="transaction-date"
              v-model="date"
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
      </div>
      <div v-if="currentAccount" class="transaction-account-context" aria-live="polite">
        <p v-if="currentBalance">
          {{ text.balance }}: <bdi>{{ currentBalance }} {{ currency }}</bdi>
        </p>
        <p v-if="earliest">{{ text.earliest }}: {{ dateLabel(earliest, language) }}</p>
      </div>
      <p v-if="loadingAccount" class="field-help" role="status">{{ accountCopy.loading }}</p>
      <button
        v-if="accountFailed"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="loadAccount(account)"
      >
        {{ accountCopy.retry }}
      </button>
      <p
        v-if="
          !item && kind === 'expense' && (!defaults.default_account || !defaults.default_currency)
        "
        class="field-help"
      >
        {{ text.noDefault }}
      </p>
      <FormField id="transaction-note" :label="text.note" :error="fieldError('note')">
        <template #default="{ describedBy, invalid }">
          <textarea
            id="transaction-note"
            v-model="note"
            maxlength="500"
            rows="3"
            dir="auto"
            :disabled="busy"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
          ></textarea>
        </template>
      </FormField>
      <div class="form-actions">
        <PrimaryButton
          :busy="busy"
          :disabled="
            loadingAccount ||
            accountFailed ||
            !accountChoicesReady ||
            (kind === 'expense' && !categoryChoicesReady)
          "
          >{{ text.save }}</PrimaryButton
        >
        <button type="button" class="secondary-button" :disabled="busy" @click="emit('cancel')">
          {{ accountCopy.cancel }}
        </button>
      </div>
    </form>
  </section>
</template>
