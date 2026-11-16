<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import AuthFlow from './components/AuthFlow.vue'
import AuthShowcase from './components/AuthShowcase.vue'
import { initializePreferences, language } from './lib/preferences'

initializePreferences()
</script>

<template>
  <a class="skip-link" href="#main">{{
    language === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'
  }}</a>
  <AppHeader />
  <main id="main" class="auth-layout">
    <AuthShowcase />
    <AuthFlow />
  </main>
</template>
