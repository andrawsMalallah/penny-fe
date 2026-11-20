<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { apiRequest, type UserSettings } from '../../lib/api'
import type { MoneyAccount } from '../../lib/accounts'
import { formatMoney } from '../../lib/accounts'
import { activityCopy as text } from '../../lib/activityCopy'
import { accountCopy } from '../../lib/accountCopy'
import {
  dateLabel,
  localDate,
  type MoneyTransaction,
  type TransactionKind,
  type TransactionValues,
} from '../../lib/transactions'
import { language } from '../../lib/preferences'
import AccountSelect from '../ui/AccountSelect.vue'
import SelectControl from '../ui/SelectControl.vue'
import FormField from '../ui/FormField.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'
import ExchangeReview from './ExchangeReview.vue'
import { exchangeAmount } from '../../lib/exchanges'

const props = defineProps<{
  item: MoneyTransaction | null
  kind: TransactionKind
  defaults: UserSettings
  busy: boolean
  fields: Record<string, string[]>
  saveDisabled?: boolean
  initialValues?: Partial<TransactionValues>
  ordinaryOnly?: boolean
  scheduleMode?: boolean
  headingLabel?: string
  submitLabel?: string
  dateFieldLabel?: string
  dateHelp?: string
}>()
const emit = defineEmits<{
  save: [values: TransactionValues]
  cancel: []
  error: [cause: unknown]
}>()
const kind = ref(props.item?.kind ?? props.initialValues?.kind ?? props.kind)
const account = ref(
  String(
    props.item?.account ??
      props.initialValues?.account ??
      (props.kind === 'expense' ? (props.defaults.default_account ?? '') : ''),
  ),
)
const currency = ref(
  props.item?.currency ??
    props.initialValues?.currency ??
    (props.kind === 'expense' ? props.defaults.default_currency : ''),
)
const category = ref(String(props.item?.category ?? props.initialValues?.category ?? ''))
const destination = ref(String(props.item?.destination ?? ''))
const destinationAccount = ref<MoneyAccount | null>(null)
const destinationChoicesReady = ref(false)
const amount = ref(props.item?.amount ?? props.initialValues?.amount ?? '')
const exchangeRate = ref(props.item?.exchange_rate ?? props.defaults.exchange_rate ?? '')
const reviewed = ref<TransactionValues | null>(null)
const exchangeError = ref(false)
const missingRate = computed(
  () =>
    kind.value === 'exchange' && props.item?.kind !== 'exchange' && !props.defaults.exchange_rate,
)
const date = ref(props.item?.date ?? props.initialValues?.date ?? localDate())
const note = ref(props.item?.note ?? props.initialValues?.note ?? '')
const currentAccount = ref<MoneyAccount | null>(null)
const loadingAccount = ref(false)
const accountFailed = ref(false)
const accountChoicesReady = ref(false)
const categoryChoicesReady = ref(false)
const heading = ref<HTMLElement | null>(null)
const earliest = computed(() => {
  const sourceDate = currentAccount.value?.opening.effective_date ?? props.item?.opening_date
  const destinationDate =
    kind.value === 'transfer'
      ? (destinationAccount.value?.opening.effective_date ?? props.item?.destination_opening_date)
      : null
  return [props.scheduleMode && props.initialValues ? undefined : sourceDate, destinationDate]
    .filter((value): value is string => !!value)
    .sort()
    .at(-1)
})
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
async function loadAccount(): Promise<void> {
  const read = ++accountRead
  currentAccount.value = null
  destinationAccount.value = null
  accountFailed.value = false
  loadingAccount.value = true
  try {
    const [source, target] = await Promise.all([
      account.value ? apiRequest<MoneyAccount>(`accounts/${account.value}/`) : null,
      kind.value === 'transfer' && destination.value
        ? apiRequest<MoneyAccount>(`accounts/${destination.value}/`)
        : null,
    ])
    if (read === accountRead) {
      currentAccount.value = source
      destinationAccount.value = target
    }
  } catch (cause) {
    if (read === accountRead) {
      accountFailed.value = true
      emit('error', cause)
    }
  } finally {
    if (read === accountRead) loadingAccount.value = false
  }
}
watch([account, destination, kind], loadAccount, { immediate: true })
watch(kind, (value) => {
  if (value !== 'expense') category.value = ''
  if (value !== 'transfer') destination.value = ''
  if (value === 'expense') {
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
    props.saveDisabled ||
    props.busy ||
    loadingAccount.value ||
    accountFailed.value ||
    !accountChoicesReady.value ||
    missingRate.value ||
    (kind.value === 'transfer' &&
      (!destinationChoicesReady.value ||
        !destination.value ||
        destination.value === account.value)) ||
    (kind.value === 'expense' && !categoryChoicesReady.value)
  )
    return
  const values: TransactionValues = {
    kind: kind.value,
    account: account.value ? Number(account.value) : null,
    destination: kind.value === 'transfer' && destination.value ? Number(destination.value) : null,
    currency: currency.value,
    category: kind.value === 'expense' && category.value ? Number(category.value) : null,
    amount: amount.value.trim(),
    exchange_rate: kind.value === 'exchange' ? exchangeRate.value.trim() : null,
    received_amount: null,
    date: date.value,
    note: note.value.trim(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  if (kind.value === 'exchange') {
    values.received_amount = exchangeAmount(values.amount, values.currency, values.exchange_rate!)
    exchangeError.value = !values.received_amount || !values.account
    if (exchangeError.value) return
    reviewed.value = values
  } else emit('save', values)
}
function changeDetails(): void {
  reviewed.value = null
  requestAnimationFrame(() => document.getElementById('transaction-amount')?.focus())
}
onMounted(() => heading.value?.focus())
onBeforeUnmount(() => {
  accountRead++
})
</script>

<template>
  <section class="transaction-editor surface-panel" aria-labelledby="transaction-editor-title">
    <h2 id="transaction-editor-title" ref="heading" tabindex="-1">
      {{
        headingLabel ||
        (item
          ? text.edit
          : kind === 'exchange'
            ? text.addExchange
            : kind === 'transfer'
              ? text.addTransfer
              : kind === 'income'
                ? text.addIncome
                : text.addExpense)
      }}
    </h2>
    <p v-if="!scheduleMode" class="field-help">{{ text.historicalHelp }}</p>
    <p v-if="kind === 'transfer'" class="field-help">{{ text.transferHelp }}</p>
    <ExchangeReview
      v-if="reviewed"
      :values="reviewed"
      :account-name="currentAccount?.name ?? ''"
      :busy="busy"
      @confirm="emit('save', reviewed)"
      @edit="changeDetails"
      @cancel="emit('cancel')"
    />
    <form v-else @submit.prevent="save">
      <slot name="schedule-fields" />
      <p v-if="kind === 'exchange'" class="field-help">{{ text.exchangeHelp }}</p>
      <p v-if="missingRate" class="field-help">
        {{ text.missingRate }} <a href="#/settings">{{ text.openSettings }}</a>
      </p>
      <p v-if="exchangeError" class="error-summary" role="alert">{{ text.exchangeError }}</p>
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
              <option value="expense">{{ text.expense }}</option>
              <option v-if="!ordinaryOnly" value="transfer">{{ text.transfer }}</option>
              <option v-if="!ordinaryOnly" value="exchange">
                {{ text.exchange }}
              </option></SelectControl
            ></template
          >
        </FormField>
        <FormField
          id="transaction-account"
          :label="kind === 'transfer' ? text.fromAccount : text.account"
          :error="fieldError('account')"
        >
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
        <FormField
          v-if="kind === 'transfer'"
          id="transaction-destination"
          :label="text.toAccount"
          :error="fieldError('destination')"
        >
          <template #default="{ describedBy, invalid }">
            <AccountSelect
              id="transaction-destination"
              v-model="destination"
              resource="accounts"
              :empty-label="text.chooseAccount"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              @error="emit('error', $event)"
              @ready="destinationChoicesReady = $event"
            />
          </template>
        </FormField>
        <FormField
          id="transaction-currency"
          :label="kind === 'exchange' ? text.payCurrency : text.currency"
          :error="fieldError('currency')"
        >
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
        <FormField
          id="transaction-amount"
          :label="kind === 'exchange' ? text.youPay : text.amount"
          :error="fieldError('amount')"
        >
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
          v-if="kind === 'exchange'"
          id="transaction-rate"
          :label="text.exchangeRate"
          :error="fieldError('exchange_rate')"
          :help="text.rateHelp"
        >
          <template #default="{ describedBy, invalid }"
            ><input
              id="transaction-rate"
              v-model="exchangeRate"
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
          :label="props.dateFieldLabel ?? text.date"
          :error="fieldError('date')"
          :help="props.dateHelp ?? text.dateHelp"
        >
          <template #default="{ describedBy, invalid }"
            ><input
              id="transaction-date"
              v-model="date"
              type="date"
              dir="ltr"
              required
              :min="earliest"
              :max="scheduleMode ? undefined : localDate()"
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
      <p
        v-if="kind === 'transfer' && destination && destination === account"
        class="field-error"
        role="status"
      >
        {{ text.sameAccount }}
      </p>
      <p v-if="loadingAccount" class="field-help" role="status">{{ accountCopy.loading }}</p>
      <button
        v-if="accountFailed"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="loadAccount()"
      >
        {{ accountCopy.retry }}
      </button>
      <p
        v-if="
          !item &&
          !initialValues &&
          kind === 'expense' &&
          (!defaults.default_account || !defaults.default_currency)
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
            saveDisabled ||
            loadingAccount ||
            accountFailed ||
            !accountChoicesReady ||
            missingRate ||
            (kind === 'transfer' &&
              (!destinationChoicesReady || !destination || destination === account)) ||
            (kind === 'expense' && !categoryChoicesReady)
          "
          >{{
            submitLabel ?? (kind === 'exchange' ? text.reviewExchange : text.save)
          }}</PrimaryButton
        >
        <button type="button" class="secondary-button" :disabled="busy" @click="emit('cancel')">
          {{ accountCopy.cancel }}
        </button>
      </div>
    </form>
  </section>
</template>
