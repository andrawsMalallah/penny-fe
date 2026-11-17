<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Debt, DebtEntryValues } from '../lib/debts'
import { localDate, type MoneyTransaction } from '../lib/transactions'
import { formatMoney } from '../lib/accounts'
import { debtCopy as text } from '../lib/debtCopy'
import DebtEntryFields from './DebtEntryFields.vue'
import PrimaryButton from './PrimaryButton.vue'

const props = defineProps<{
  debt: Debt
  item: MoneyTransaction | null
  busy: boolean
  fields: Record<string, string[]>
}>()
const emit = defineEmits<{ save: [values: DebtEntryValues]; cancel: []; error: [cause: unknown] }>()
const values = ref<DebtEntryValues>({
  account: props.item?.account ?? null,
  amount: props.item?.amount ?? '',
  date: props.item?.date ?? localDate(),
  note: props.item?.note ?? '',
})
const ready = ref(false),
  heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
function save(): void {
  if (!props.busy && ready.value)
    emit('save', {
      ...values.value,
      amount: values.value.amount.trim(),
      note: values.value.note.trim(),
    })
}
</script>
<template>
  <section class="debt-editor transaction-editor surface-panel">
    <h2 ref="heading" tabindex="-1">{{ item ? text.editRepayment : text.repay }}</h2>
    <p dir="auto">{{ debt.person_name }}</p>
    <p>{{ text[debt.direction] }}</p>
    <p>
      {{ text.remaining }}: <bdi>{{ formatMoney(debt.remaining) }} {{ debt.currency }}</bdi>
    </p>
    <p class="field-help">{{ text.repaymentHelp }}</p>
    <form @submit.prevent="save">
      <DebtEntryFields
        v-model="values"
        with-account
        :account-label="debt.direction === 'owed_to_me' ? text.receiveInto : text.payFrom"
        :currency="debt.currency"
        :amount-label="text.repaymentAmount"
        :earliest="debt.date"
        :busy="busy"
        :fields="fields"
        @ready="ready = $event"
        @error="emit('error', $event)"
      />
      <div class="form-actions">
        <PrimaryButton :busy="busy" :disabled="!ready">{{
          text.saveRepayment
        }}</PrimaryButton><button
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="emit('cancel')"
        >
          {{ text.cancel }}
        </button>
      </div>
    </form>
  </section>
</template>
