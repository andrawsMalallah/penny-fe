<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AuthFlow from './components/AuthFlow.vue'
import AuthShowcase from './components/AuthShowcase.vue'
import WorkspaceNavigation from './components/WorkspaceNavigation.vue'
import AppFooter from './components/GuestFooter.vue'
import { copy } from './lib/copy'
import { accountCopy } from './lib/accountCopy'
import { designCopy } from './lib/designCopy'
import { activityCopy } from './lib/activityCopy'
import { useNavigation } from './lib/navigation'
import { initializePreferences, language } from './lib/preferences'
import { useWorkspaceSession } from './lib/useWorkspaceSession'

initializePreferences()
const SettingsPage = defineAsyncComponent(() => import('./components/SettingsPage.vue'))
const AccountsPage = defineAsyncComponent(() => import('./components/AccountsPage.vue'))
const ActivityPage = defineAsyncComponent(() => import('./components/ActivityPage.vue'))
const OverviewPage = defineAsyncComponent(() => import('./components/OverviewPage.vue'))
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
const main = ref<HTMLElement | null>(null)

watch(
  [page, user, language],
  () => {
    document.title =
      page.value === 'activity' && user.value
        ? `${activityCopy.value.title} | Penny`
        : page.value === 'accounts' && user.value
          ? `${accountCopy.value.accounts} | Penny`
          : page.value === 'settings' && user.value
            ? `${copy.value.settings} | Penny`
            : page.value === 'preferences'
              ? `${copy.value.languageAppearance} | Penny`
              : 'Penny'
  },
  { immediate: true },
)
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="main?.focus()">{{
    language === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'
  }}</a>
  <div class="app-shell" :class="user ? 'authenticated-shell' : 'guest-shell'">
    <WorkspaceNavigation v-if="user" :page="page" @navigate="navigate" />
    <AppHeader
      :user="user"
      :busy="busy"
      :title="
        page === 'activity'
          ? activityCopy.title
          : page === 'accounts'
            ? accountCopy.accounts
            : page === 'home'
              ? designCopy.overview
              : copy.settings
      "
      @settings="navigate('settings')"
      @logout="logout"
      @home="navigate('home')"
    />
    <main id="main" ref="main" tabindex="-1" :class="user ? 'workspace-main' : 'auth-layout'">
      <div
        v-if="error"
        ref="errorSummary"
        class="error-summary app-error"
        role="alert"
        tabindex="-1"
      >
        {{ error }}
      </div>
      <AccountsPage
        v-if="page === 'accounts' && user"
        @back="navigate('home')"
        @settings="navigate('settings')"
        @expired="finishSession(false, true)"
      />
      <SettingsPage
        v-else-if="page === 'settings' && user"
        @expired="finishSession(false, true)"
        @signed-out="finishSession(true)"
        @saved="updateLanguage"
        @accounts="navigate('accounts')"
      />
      <ActivityPage v-else-if="page === 'activity' && user" @expired="finishSession(false, true)" />
      <PreferencesPage
        v-else-if="page === 'preferences' && user"
        @back="navigate(user ? 'settings' : 'home')"
      />
      <OverviewPage
        v-else-if="user"
        :user="user"
        @accounts="navigate('accounts')"
        @settings="navigate('settings')"
        @expired="finishSession(false, true)"
      />
      <template v-else>
        <AuthShowcase />
      </template>
      <div v-if="signedOutEverywhere && !user" class="notice app-error" role="status">
        {{ copy.sessionsSignedOut }}
      </div>
      <AuthFlow v-if="!user" @authenticated="authenticated" />
    </main>
    <AppFooter />
  </div>
</template>
