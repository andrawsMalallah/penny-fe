<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CategoryValues, ExpenseCategory } from '../../lib/categories'
import { categoryCopy as text } from '../../lib/categoryCopy'
import { accountCopy } from '../../lib/accountCopy'
import FormField from '../ui/FormField.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

const props = defineProps<{
  item: ExpenseCategory | null
  busy: boolean
  fields: Record<string, string[]>
}>()
const emit = defineEmits<{ save: [values: CategoryValues]; cancel: [] }>()
const names = ref<CategoryValues>({
  name_en: props.item?.name_en ?? '',
  name_ar: props.item?.name_ar ?? '',
})
const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <section class="category-editor" aria-labelledby="category-editor-title">
    <h2 id="category-editor-title" ref="heading" tabindex="-1">
      {{ item ? text.edit : text.add }}
    </h2>
    <p id="category-name-help" class="field-help">{{ text.nameHelp }}</p>
    <form
      @submit.prevent="
        emit('save', { name_en: names.name_en.trim(), name_ar: names.name_ar.trim() })
      "
    >
      <FormField
        v-for="locale in ['en', 'ar'] as const"
        :id="`category-name-${locale}`"
        :key="locale"
        :label="locale === 'en' ? text.englishName : text.arabicName"
        :error="fields[`name_${locale}`]?.length ? text.validation : undefined"
      >
        <template #default="{ describedBy, invalid }">
          <input
            :id="`category-name-${locale}`"
            v-model="names[`name_${locale}`]"
            type="text"
            :dir="locale === 'ar' ? 'rtl' : 'ltr'"
            :lang="locale"
            maxlength="100"
            autocomplete="off"
            :disabled="busy"
            :aria-invalid="invalid"
            :aria-describedby="[describedBy, 'category-name-help'].filter(Boolean).join(' ')"
          />
        </template>
      </FormField>
      <div class="form-actions">
        <PrimaryButton :busy="busy">{{ item ? accountCopy.save : text.add }}</PrimaryButton>
        <button type="button" class="secondary-button" :disabled="busy" @click="emit('cancel')">
          {{ accountCopy.cancel }}
        </button>
      </div>
    </form>
  </section>
</template>
