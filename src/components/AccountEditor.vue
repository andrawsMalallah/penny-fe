<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AccountGroup, AccountValues, MoneyAccount } from '../lib/accounts'
import { accountCopy as text } from '../lib/accountCopy'
import AuthInput from './AuthInput.vue'
import FormField from './FormField.vue'
import AccountSelect from './AccountSelect.vue'
import PrimaryButton from './PrimaryButton.vue'

const props = defineProps<{
  item: AccountGroup | MoneyAccount | null
  groups: boolean
  busy: boolean
  fields: Record<string, string>
}>()
const emit = defineEmits<{
  save: [values: AccountValues | { name: string }]
  cancel: []
  error: [cause: unknown]
}>()
const name = ref(props.item?.name ?? '')
const group = ref(
  props.item && 'group' in props.item && props.item.group ? String(props.item.group) : '',
)
const openingIqd = ref('0.00')
const openingUsd = ref('0.00')
const targets = ref({
  IQD: props.item && 'balance_iqd' in props.item ? (props.item.target_iqd ?? '') : '',
  USD: props.item && 'balance_usd' in props.item ? (props.item.target_usd ?? '') : '',
})
const heading = ref<HTMLElement | null>(null)
function save(): void {
  emit(
    'save',
    props.groups
      ? { name: name.value.trim() }
      : {
          name: name.value.trim(),
          group: group.value ? Number(group.value) : null,
          target_iqd: targets.value.IQD.trim() || null,
          target_usd: targets.value.USD.trim() || null,
          ...(props.item && 'balance_iqd' in props.item
            ? { target_version: props.item.target_version ?? 1 }
            : {}),
          ...(props.item
            ? {}
            : {
                opening_iqd: openingIqd.value.trim(),
                opening_usd: openingUsd.value.trim(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
        },
  )
}
onMounted(() => heading.value?.focus())
</script>
<template>
  <section class="account-editor" aria-labelledby="account-editor-title">
    <h2 id="account-editor-title" ref="heading" tabindex="-1">
      {{
        groups ? (item ? text.editGroup : text.addGroup) : item ? text.editAccount : text.addAccount
      }}
    </h2>
    <form @submit.prevent="save">
      <AuthInput
        id="account-name"
        v-model="name"
        :label="text.name"
        :maxlength="100"
        :disabled="busy"
        :error="fields.name"
        autocomplete="off"
      />
      <FormField v-if="!groups" id="account-group" :label="text.group" :error="fields.group">
        <template #default="{ describedBy, invalid }">
          <AccountSelect
            id="account-group"
            v-model="group"
            resource="account-groups"
            :empty-label="text.ungrouped"
            :disabled="busy"
            :invalid="invalid"
            :described-by="describedBy"
            @error="emit('error', $event)"
          />
        </template>
      </FormField>
      <fieldset v-if="!groups && !item" class="opening-fields" :disabled="busy">
        <legend>{{ text.opening }}</legend>
        <p class="field-help">{{ text.openingHelp }}</p>
        <div class="money-inputs">
          <FormField
            v-for="currency in ['IQD', 'USD'] as const"
            :id="`opening-${currency}`"
            :key="currency"
            :label="currency === 'IQD' ? text.openingIqd : text.openingUsd"
            :error="fields[currency === 'IQD' ? 'opening_iqd' : 'opening_usd']"
          >
            <template #default="{ describedBy, invalid }">
              <input
                v-if="currency === 'IQD'"
                :id="`opening-${currency}`"
                v-model="openingIqd"
                dir="ltr"
                inputmode="decimal"
                type="text"
                maxlength="19"
                required
                autocomplete="off"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
              />
              <input
                v-else
                :id="`opening-${currency}`"
                v-model="openingUsd"
                dir="ltr"
                inputmode="decimal"
                type="text"
                maxlength="19"
                required
                autocomplete="off"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
              />
            </template>
          </FormField>
        </div>
      </fieldset>
      <fieldset v-if="!groups" class="opening-fields" :disabled="busy">
        <legend>{{ text.targets }}</legend>
        <p class="field-help">{{ text.targetsHelp }}</p>
        <div class="money-inputs">
          <FormField
            v-for="currency in ['IQD', 'USD'] as const"
            :id="`target-${currency}`"
            :key="currency"
            :label="`${text.target} · ${currency}`"
            :error="fields[currency === 'IQD' ? 'target_iqd' : 'target_usd']"
          >
            <template #default="{ describedBy, invalid }">
              <input
                :id="`target-${currency}`"
                v-model="targets[currency]"
                dir="ltr"
                inputmode="decimal"
                type="text"
                maxlength="19"
                autocomplete="off"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
              />
            </template>
          </FormField>
        </div>
      </fieldset>
      <p v-if="groups" class="field-help">{{ text.groupRule }}</p>
      <div class="form-actions">
        <PrimaryButton :busy="busy">{{
          item ? text.save : groups ? text.addGroup : text.addAccount
        }}</PrimaryButton>
        <button type="button" class="secondary-button" :disabled="busy" @click="emit('cancel')">
          {{ text.cancel }}
        </button>
      </div>
    </form>
  </section>
</template>
