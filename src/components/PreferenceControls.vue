<script setup lang="ts">
import { copy } from '../lib/copy'
import { appearance, language } from '../lib/preferences'
import SelectControl from './SelectControl.vue'
defineProps<{ disabled?: boolean }>()
</script>

<template>
  <div class="preference-controls">
    <div class="form-field">
      <label for="settings-language">{{ copy.languageLabel }}</label>
      <SelectControl id="settings-language" v-model="language" :disabled="disabled">
        <option value="en" lang="en">English</option>
        <option value="ar" lang="ar">العربية</option>
      </SelectControl>
    </div>
    <div class="form-field">
      <label for="settings-appearance">{{ copy.appearance }}</label>
      <SelectControl id="settings-appearance" v-model="appearance" :disabled="disabled">
        <option value="system">{{ copy.system }}</option>
        <option value="light">{{ copy.light }}</option>
        <option value="dark">{{ copy.dark }}</option>
      </SelectControl>
    </div>
  </div>
</template>
