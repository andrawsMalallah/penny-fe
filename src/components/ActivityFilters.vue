<script setup lang="ts">
import type { ActivityFilters } from '../lib/transactions'
import { activityCopy as text } from '../lib/activityCopy'
import { debtCopy } from '../lib/debtCopy'
import AccountSelect from './AccountSelect.vue'
import SelectControl from './SelectControl.vue'
import FormField from './FormField.vue'
const filters = defineModel<ActivityFilters>({ required: true })
const props = defineProps<{ busy: boolean; fields: Record<string, string[]> }>()
defineEmits<{ apply: []; clear: []; error: [cause: unknown] }>()
function fieldError(field: string): string | undefined {
  return props.fields[field]?.length ? text.value.invalidField : undefined
}
</script>
<template>
  <details class="activity-filter-panel surface-panel">
    <summary>{{ text.filters }}</summary>
    <form @submit.prevent="$emit('apply')">
      <div class="activity-filter-fields">
        <FormField id="activity-account" :label="text.account" :error="fieldError('account')"
          ><AccountSelect
            id="activity-account"
            v-model="filters.account"
            resource="accounts"
            :empty-label="text.allAccounts"
            :disabled="busy"
            include-archived
            :invalid="!!fieldError('account')"
            :described-by="fieldError('account') ? 'activity-account-description' : undefined"
            @error="$emit('error', $event)"
        /></FormField>
        <FormField id="activity-kind" :label="text.kind" :error="fieldError('kind')"
          ><SelectControl id="activity-kind" v-model="filters.kind" :disabled="busy"
            ><option value="">{{ text.allTypes }}</option>
            <option value="income">{{ text.income }}</option>
            <option value="expense">{{ text.expense }}</option>
            <option value="transfer">{{ text.transfer }}</option>
            <option value="exchange">{{ text.exchange }}</option>
            <option value="debt_in">{{ debtCopy.debt_in }}</option>
            <option value="debt_out">{{ debtCopy.debt_out }}</option></SelectControl
          ></FormField
        >
        <FormField id="activity-currency" :label="text.currency" :error="fieldError('currency')"
          ><SelectControl id="activity-currency" v-model="filters.currency" :disabled="busy"
            ><option value="">{{ text.allCurrencies }}</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option></SelectControl
          ></FormField
        >
        <FormField id="activity-start" :label="text.start" :error="fieldError('start')"
          ><input
            id="activity-start"
            v-model="filters.start"
            type="date"
            dir="ltr"
            :disabled="busy"
            :aria-invalid="!!fieldError('start')"
            :aria-describedby="fieldError('start') ? 'activity-start-description' : undefined"
        /></FormField>
        <FormField id="activity-end" :label="text.end" :error="fieldError('end')"
          ><input
            id="activity-end"
            v-model="filters.end"
            type="date"
            dir="ltr"
            :min="filters.start || undefined"
            :disabled="busy"
            :aria-invalid="!!fieldError('end')"
            :aria-describedby="fieldError('end') ? 'activity-end-description' : undefined"
        /></FormField>
      </div>
      <div class="form-actions activity-filter-actions">
        <button type="submit" class="secondary-button" :disabled="busy">{{ text.apply }}</button>
        <button type="button" class="text-button" :disabled="busy" @click="$emit('clear')">
          {{ text.clear }}
        </button>
      </div>
    </form>
  </details>
</template>
