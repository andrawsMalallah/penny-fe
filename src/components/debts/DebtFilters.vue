<script setup lang="ts">
import type { DebtFilters } from '../../lib/debts'
import { debtCopy as text } from '../../lib/debtCopy'
import AccountSelect from '../ui/AccountSelect.vue'
import FormField from '../ui/FormField.vue'
import SelectControl from '../ui/SelectControl.vue'
const filters = defineModel<DebtFilters>({ required: true })
defineProps<{ busy: boolean }>()
defineEmits<{ apply: []; clear: []; error: [cause: unknown] }>()
</script>
<template>
  <details class="activity-filter-panel surface-panel">
    <summary>{{ text.filters }}</summary>
    <form @submit.prevent="$emit('apply')">
      <div class="debt-entry-fields">
        <FormField id="filter-debt-person" :label="text.person"
          ><AccountSelect
            id="filter-debt-person"
            v-model="filters.person"
            resource="debt-people"
            :empty-label="text.allPeople"
            :disabled="busy"
            @error="$emit('error', $event)"
        /></FormField>
        <FormField id="filter-debt-direction" :label="text.direction"
          ><SelectControl id="filter-debt-direction" v-model="filters.direction" :disabled="busy"
            ><option value="">{{ text.allDirections }}</option>
            <option value="owed_to_me">{{ text.owed_to_me }}</option>
            <option value="i_owe">{{ text.i_owe }}</option></SelectControl
          ></FormField
        >
        <FormField id="filter-debt-currency" :label="text.currency"
          ><SelectControl id="filter-debt-currency" v-model="filters.currency" :disabled="busy"
            ><option value="">{{ text.allCurrencies }}</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option></SelectControl
          ></FormField
        >
        <FormField id="filter-debt-status" :label="text.status"
          ><SelectControl id="filter-debt-status" v-model="filters.status" :disabled="busy"
            ><option value="open">{{ text.open }}</option>
            <option value="settled">{{ text.settled }}</option>
            <option value="all">{{ text.all }}</option></SelectControl
          ></FormField
        >
      </div>
      <div class="form-actions">
        <button type="submit" class="secondary-button" :disabled="busy">
          {{ text.apply }}</button><button
          type="button"
          class="text-button"
          :disabled="busy"
          @click="$emit('clear')"
        >
          {{ text.clear }}
        </button>
      </div>
    </form>
  </details>
</template>
