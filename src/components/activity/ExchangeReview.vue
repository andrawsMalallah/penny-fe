<script setup lang="ts">
import type { TransactionValues, Currency } from '../../lib/transactions'
import { dateLabel } from '../../lib/transactions'
import { receivedCurrency } from '../../lib/exchanges'
import { formatMoney } from '../../lib/accounts'
import { activityCopy as text } from '../../lib/activityCopy'
import { accountCopy } from '../../lib/accountCopy'
import { language } from '../../lib/preferences'
import { onMounted, ref } from 'vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

defineProps<{ values: TransactionValues; accountName: string; busy: boolean }>()
defineEmits<{ confirm: []; edit: []; cancel: [] }>()
const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>
<template>
  <div class="exchange-review">
    <h3 ref="heading" tabindex="-1">{{ text.reviewExchange }}</h3>
    <p dir="auto">{{ accountName }}</p>
    <dl class="exchange-breakdown">
      <div>
        <dt>{{ text.youPay }}</dt>
        <dd>
          <bdi>{{ formatMoney(values.amount) }} {{ values.currency }}</bdi>
        </dd>
      </div>
      <div>
        <dt>{{ text.youReceive }}</dt>
        <dd>
          <bdi
            >{{ formatMoney(values.received_amount!) }}
            {{ receivedCurrency(values.currency as Currency) }}</bdi
          >
        </dd>
      </div>
      <div>
        <dt>{{ text.exchangeRate }}</dt>
        <dd>
          <bdi>1 USD = {{ values.exchange_rate }} IQD</bdi>
        </dd>
      </div>
      <div>
        <dt>{{ text.date }}</dt>
        <dd>{{ dateLabel(values.date, language) }}</dd>
      </div>
    </dl>
    <p class="field-help">{{ text.roundingHelp }}</p>
    <p v-if="values.note" class="transaction-note" dir="auto">{{ values.note }}</p>
    <div class="form-actions">
      <PrimaryButton type="button" :busy="busy" @click="$emit('confirm')">{{
        text.confirmExchange
      }}</PrimaryButton>
      <button type="button" class="secondary-button" :disabled="busy" @click="$emit('edit')">
        {{ text.changeDetails }}
      </button>
    </div>
    <button type="button" class="text-button" :disabled="busy" @click="$emit('cancel')">
      {{ accountCopy.cancel }}
    </button>
  </div>
</template>
