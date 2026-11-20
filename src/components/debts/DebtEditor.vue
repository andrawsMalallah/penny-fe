<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Debt, DebtValues } from '../../lib/debts'
import { localDate } from '../../lib/transactions'
import { debtCopy as text } from '../../lib/debtCopy'
import DebtEntryFields from './DebtEntryFields.vue'
import AccountSelect from '../ui/AccountSelect.vue'
import FormField from '../ui/FormField.vue'
import SelectControl from '../ui/SelectControl.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

const props = defineProps<{ item: Debt | null; busy: boolean; fields: Record<string, string[]> }>()
const emit = defineEmits<{ save: [values: DebtValues]; cancel: []; error: [cause: unknown] }>()
const values = ref<DebtValues>(
  props.item
    ? {
        person: props.item.person,
        person_name: '',
        direction: props.item.direction,
        origin: props.item.origin,
        currency: props.item.currency,
        account: props.item.account,
        amount: props.item.amount,
        date: props.item.date,
        note: props.item.note,
      }
    : {
        person: null,
        person_name: '',
        direction: 'owed_to_me',
        origin: 'existing',
        currency: '',
        account: null,
        amount: '',
        date: localDate(),
        note: '',
      },
)
const personMode = ref(props.item ? 'existing' : 'new')
const person = ref(String(props.item?.person ?? ''))
const choicesReady = ref(false),
  moneyReady = ref(false)
const heading = ref<HTMLElement | null>(null)
watch(
  () => values.value.origin,
  (value) => {
    if (value === 'existing') values.value.account = null
  },
)
onMounted(() => heading.value?.focus())
function fieldError(field: string): string | undefined {
  return props.fields[field]?.length ? text.value.invalid : undefined
}
function save(): void {
  if (props.busy || !moneyReady.value || (personMode.value === 'existing' && !choicesReady.value))
    return
  emit('save', {
    ...values.value,
    person: personMode.value === 'existing' && person.value ? Number(person.value) : null,
    person_name: personMode.value === 'new' ? values.value.person_name.trim() : '',
    amount: values.value.amount.trim(),
    note: values.value.note.trim(),
  })
}
</script>
<template>
  <section class="debt-editor transaction-editor surface-panel">
    <h2 ref="heading" tabindex="-1">{{ item ? text.edit : text.add }}</h2>
    <p class="field-help">{{ text.safeguards }}</p>
    <form @submit.prevent="save">
      <div class="debt-entry-fields">
        <FormField id="debt-person-mode" :label="text.personChoice"
          ><SelectControl id="debt-person-mode" v-model="personMode" :disabled="busy"
            ><option value="new">{{ text.newPerson }}</option>
            <option value="existing">{{ text.existingPerson }}</option></SelectControl
          ></FormField
        >
        <FormField
          v-if="personMode === 'new'"
          id="debt-person-name"
          :label="text.personName"
          :error="fieldError('person_name') ?? fieldError('person')"
          ><template #default="{ describedBy, invalid }"
            ><input
              id="debt-person-name"
              v-model="values.person_name"
              type="text"
              maxlength="100"
              dir="auto"
              required
              :disabled="busy"
              :aria-invalid="invalid"
              :aria-describedby="describedBy" /></template
        ></FormField>
        <FormField v-else id="debt-person" :label="text.person" :error="fieldError('person')"
          ><template #default="{ describedBy, invalid }"
            ><AccountSelect
              id="debt-person"
              v-model="person"
              resource="debt-people"
              :empty-label="text.existingPerson"
              :disabled="busy"
              :invalid="invalid"
              :described-by="describedBy"
              @ready="choicesReady = $event"
              @error="emit('error', $event)" /></template
        ></FormField>
        <FormField id="debt-direction" :label="text.direction" :error="fieldError('direction')"
          ><SelectControl
            id="debt-direction"
            v-model="values.direction"
            :invalid="!!fieldError('direction')"
            :described-by="fieldError('direction') ? 'debt-direction-description' : undefined"
            :disabled="busy || !!item?.repayment_count"
            ><option value="owed_to_me">{{ text.owed_to_me }}</option>
            <option value="i_owe">{{ text.i_owe }}</option></SelectControl
          ></FormField
        >
        <FormField id="debt-currency" :label="text.currency" :error="fieldError('currency')"
          ><SelectControl
            id="debt-currency"
            v-model="values.currency"
            :invalid="!!fieldError('currency')"
            :described-by="fieldError('currency') ? 'debt-currency-description' : undefined"
            :disabled="busy || !!item?.repayment_count"
            ><option value="">{{ text.chooseCurrency }}</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option></SelectControl
          ></FormField
        >
        <FormField id="debt-origin" :label="text.origin" :error="fieldError('origin')"
          ><SelectControl
            id="debt-origin"
            v-model="values.origin"
            :disabled="busy"
            :invalid="!!fieldError('origin')"
            :described-by="fieldError('origin') ? 'debt-origin-description' : undefined"
            ><option value="existing">{{ text.existing }}</option>
            <option value="movement">{{ text.movement }}</option></SelectControl
          ></FormField
        >
      </div>
      <p class="field-help">
        {{ values.origin === 'existing' ? text.existingHelp : text.movementHelp }}
      </p>
      <p v-if="item?.repayment_count" class="field-help">{{ text.lockedFields }}</p>
      <DebtEntryFields
        v-model="values"
        :with-account="values.origin === 'movement'"
        :account-label="values.direction === 'owed_to_me' ? text.payFrom : text.receiveInto"
        :currency="values.currency"
        :amount-label="text.amount"
        :busy="busy"
        :fields="fields"
        @ready="moneyReady = $event"
        @error="emit('error', $event)"
      />
      <div class="form-actions">
        <PrimaryButton
          :busy="busy"
          :disabled="!moneyReady || (personMode === 'existing' && !choicesReady)"
          >{{ text.save }}</PrimaryButton><button
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
