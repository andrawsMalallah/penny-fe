<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiRequest } from '../../lib/api'
import { getAccountPage, type AccountResource, type RecordPage } from '../../lib/accounts'
import { accountCopy as text } from '../../lib/accountCopy'
import SelectControl from './SelectControl.vue'
import PageControls from './PageControls.vue'
import { categoryName } from '../../lib/categories'
import type { AccountGroup } from '../../lib/accounts'
import type { ExpenseCategory } from '../../lib/categories'
import { language } from '../../lib/preferences'

const model = defineModel<string>({ required: true })
const props = defineProps<{
  id: string
  resource: AccountResource
  emptyLabel: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  includeArchived?: boolean
}>()
const emit = defineEmits<{ error: [cause: unknown]; ready: [ready: boolean] }>()
type Choice = AccountGroup | ExpenseCategory
const records = ref<RecordPage<Choice> | null>(null)
const selected = ref<Choice | null>(null)
const page = ref(1)
const busy = ref(false)
const failed = ref(false)
async function load(value = 1): Promise<void> {
  busy.value = true
  emit('ready', false)
  failed.value = false
  try {
    const result = await getAccountPage<Choice>(
      props.resource,
      value,
      props.includeArchived ? 'all' : false,
    )
    if (model.value && !result.results.some((item) => String(item.id) === model.value)) {
      selected.value = await apiRequest<Choice>(`${props.resource}/${model.value}/`)
    } else selected.value = null
    records.value = result
    page.value = value
    emit('ready', true)
  } catch (cause) {
    failed.value = true
    emit('error', cause)
  } finally {
    busy.value = false
  }
}
onMounted(() => load())
function label(item: Choice): string {
  const name = 'name' in item ? item.name : categoryName(item, language.value)
  return item.archived ? `${name} (${text.value.archived})` : name
}
</script>
<template>
  <div class="account-select" :aria-busy="busy">
    <SelectControl
      :id="id"
      v-model="model"
      :disabled="disabled || busy || failed"
      :invalid="invalid"
      :described-by="describedBy"
    >
      <option value="">{{ emptyLabel }}</option>
      <option
        v-if="selected && !records?.results.some((item) => item.id === selected?.id)"
        :value="String(selected.id)"
      >
        {{ label(selected) }}
      </option>
      <option v-for="item in records?.results ?? []" :key="item.id" :value="String(item.id)">
        {{ label(item) }}
      </option>
    </SelectControl>
    <p v-if="busy" class="field-help" role="status">{{ text.loading }}</p>
    <button
      v-if="failed"
      type="button"
      class="text-button"
      :disabled="disabled"
      @click="load(page)"
    >
      {{ text.retry }}
    </button>
    <PageControls
      v-if="records"
      :page="page"
      :next="!!records.next"
      :previous="!!records.previous"
      :busy="busy || !!disabled"
      @change="load"
    />
  </div>
</template>
