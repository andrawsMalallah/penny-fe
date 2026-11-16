<script setup lang="ts">
import { defineAsyncComponent, nextTick, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AuthFlow from './components/AuthFlow.vue'
import AuthShowcase from './components/AuthShowcase.vue'
import AuthWelcomePanel from './components/AuthWelcomePanel.vue'
import AppFooter from './components/GuestFooter.vue'
import { copy } from './lib/copy'
import { useNavigation } from './lib/navigation'
import { initializePreferences, language } from './lib/preferences'
import { useWorkspaceSession } from './lib/useWorkspaceSession'

initializePreferences()
const SettingsPage = defineAsyncComponent(() => import('./components/SettingsPage.vue'))
const PreferencesPage = defineAsyncComponent(() => import('./components/PreferencesPage.vue'))
const { page, navigate } = useNavigation()
const errorSummary = ref<HTMLElement | null>(null)
const {
  user,
  busy,
  signedOutEverywhere,
  error,
  authenticated,
  finishSession,
  updateLanguage,
  logout,
} = useWorkspaceSession(errorSummary, () => navigate('home'))
const welcomeHeading = ref<HTMLElement | null>(null)
const main = ref<HTMLElement | null>(null)

watch(
  [page, user, language],
  async () => {
    document.title =
      page.value === 'settings' && user.value
        ? `${copy.value.settings} | Penny`
        : page.value === 'preferences'
          ? `${copy.value.languageAppearance} | Penny`
          : 'Penny'
    await nextTick()
    if (page.value === 'home' && user.value) welcomeHeading.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="main?.focus()">{{
    language === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'
  }}</a>
  <AppHeader
    :user="user"
    :busy="busy"
    @settings="navigate('settings')"
    @logout="logout"
    @home="navigate('home')"
  />
  <main
    id="main"
    ref="main"
    tabindex="-1"
    :class="
      (page === 'preferences' || page === 'settings') && user ? 'settings-layout' : 'auth-layout'
    "
  >
    <div v-if="error" ref="errorSummary" class="error-summary app-error" role="alert" tabindex="-1">
      {{ error }}
    </div>
    <SettingsPage
      v-if="page === 'settings' && user"
      @back="navigate('home')"
      @expired="finishSession(false, true)"
      @signed-out="finishSession(true)"
      @saved="updateLanguage"
    />
    <PreferencesPage
      v-else-if="page === 'preferences' && user"
      @back="navigate(user ? 'settings' : 'home')"
    />
    <template v-else>
      <AuthShowcase />
      <section v-if="user" class="auth-panel" aria-labelledby="welcome-title">
        <div class="form-heading">
          <h2 id="welcome-title" ref="welcomeHeading" tabindex="-1">{{ copy.successTitle }}</h2>
          <p>{{ copy.successBody }}</p>
        </div>
        <AuthWelcomePanel :user="user" />
        <p class="privacy-note">{{ copy.privacyNote }}</p>
      </section>
    </template>
    <div v-if="signedOutEverywhere && !user" class="notice app-error" role="status">
      {{ copy.sessionsSignedOut }}
    </div>
    <AuthFlow v-if="!user" @authenticated="authenticated" />
  </main>
  <AppFooter />
</template>
