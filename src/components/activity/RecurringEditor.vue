<script setup lang="ts">
import { ref } from 'vue'
import type { UserSettings } from '../../lib/api'
import type { TransactionValues } from '../../lib/transactions'
import { recurringCopy as text } from '../../lib/recurringCopy'
import {
  scheduleTransaction,
  type Frequency,
  type RecurringSchedule,
  type ScheduleValues,
} from '../../lib/recurring'
import TransactionEditor from './TransactionEditor.vue'
import FormField from '../ui/FormField.vue'
import SelectControl from '../ui/SelectControl.vue'
const props = defineProps<{
  item: RecurringSchedule | null
  busy: boolean
  blocked: boolean
  fields: Record<string, string[]>
}>()
const emit = defineEmits<{ save: [values: ScheduleValues]; cancel: []; error: [cause: unknown] }>()
const name = ref(props.item?.name ?? ''),
  frequency = ref<Frequency>(props.item?.frequency ?? 'monthly'),
  endDate = ref(props.item?.end_date ?? '')
const initial = props.item
  ? { ...scheduleTransaction(props.item), date: props.item.start_date }
  : undefined
const defaults: UserSettings = {
  language: 'en',
  default_account: null,
  default_currency: '',
  exchange_rate: null,
}
function save(values: TransactionValues): void {
  emit('save', {
    name: name.value.trim(),
    frequency: frequency.value,
    start_date: values.date,
    end_date: endDate.value || null,
    kind: values.kind as 'income' | 'expense',
    account: values.account!,
    category: values.category,
    currency: values.currency as 'IQD' | 'USD',
    amount: values.amount,
    note: values.note,
    timezone: values.timezone,
  })
}
</script>
<template>
  <TransactionEditor
    :save-disabled="blocked"
    :item="null"
    :kind="item?.kind ?? 'expense'"
    :defaults="defaults"
    :initial-values="initial"
    :busy="busy"
    :fields="{ ...fields, date: fields.start_date ?? [] }"
    ordinary-only
    schedule-mode
    :heading-label="item ? text.edit : text.add"
    :submit-label="text.save"
    :date-field-label="text.start"
    :date-help="text.startHelp"
    @save="save"
    @cancel="emit('cancel')"
    @error="emit('error', $event)"
  >
    <template #schedule-fields>
      <p class="field-help">{{ text.timingHelp }}</p>
      <FormField id="recurring-name" :label="text.name" :error="fields.name ? text.invalid : ''"
        ><input
          id="recurring-name"
          v-model="name"
          required
          maxlength="100"
          autocomplete="off"
          :disabled="busy"
      /></FormField>
      <div class="transaction-fields">
        <FormField id="recurring-frequency" :label="text.frequency"
          ><SelectControl id="recurring-frequency" v-model="frequency" :disabled="busy"
            ><option
              v-for="value in ['weekly', 'monthly', 'yearly'] as const"
              :key="value"
              :value="value"
            >
              {{ text[value] }}
            </option></SelectControl
          ></FormField
        >
        <FormField
          id="recurring-end"
          :label="text.end"
          :help="text.endHelp"
          :error="fields.end_date ? text.invalid : ''"
          ><input id="recurring-end" v-model="endDate" type="date" :disabled="busy"
        /></FormField>
      </div>
    </template>
  </TransactionEditor>
</template>
