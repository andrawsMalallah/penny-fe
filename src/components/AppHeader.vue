<script setup lang="ts">
import { copy } from '../lib/copy'
import { appearance, language } from '../lib/preferences'
</script>

<template>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Penny">
      <img src="/logo.svg" width="34" height="34" alt="" /><span>Penny</span>
    </a>
    <div class="header-controls">
      <button
        class="language-button"
        type="button"
        :lang="language === 'en' ? 'ar' : 'en'"
        @click="language = language === 'en' ? 'ar' : 'en'"
      >
        {{ language === 'en' ? 'العربية' : 'English' }}
      </button>
      <label class="appearance-control">
        <span class="sr-only">{{ copy.appearance }}</span>
        <select v-model="appearance">
          <option value="system">{{ copy.system }}</option>
          <option value="light">{{ copy.light }}</option>
          <option value="dark">{{ copy.dark }}</option>
        </select>
      </label>
    </div>
  </header>
</template>
