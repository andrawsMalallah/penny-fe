<script setup lang="ts">
import type { Page } from '../lib/navigation'
import { designCopy as text } from '../lib/designCopy'
import { accountCopy } from '../lib/accountCopy'
import { copy } from '../lib/copy'
import { activityCopy } from '../lib/activityCopy'
import ControlIcon from './ControlIcon.vue'
defineProps<{ page: Page }>()
const emit = defineEmits<{ navigate: [page: Page] }>()
</script>
<template>
  <nav class="workspace-navigation" :aria-label="text.navigation">
    <a class="sidebar-brand brand" href="#/" @click.prevent="emit('navigate', 'home')"
      ><img src="/logo.svg" width="34" height="34" alt="" /><span>Penny</span></a
    >
    <div class="workspace-destinations">
      <a
        href="#/"
        :aria-current="page === 'home' ? 'page' : undefined"
        @click.prevent="emit('navigate', 'home')"
        ><ControlIcon name="home" /><span>{{ text.overview }}</span></a
      >
      <a
        href="#/accounts"
        :aria-current="page === 'accounts' ? 'page' : undefined"
        @click.prevent="emit('navigate', 'accounts')"
        ><ControlIcon name="wallet" /><span>{{ accountCopy.accounts }}</span></a
      >
      <a
        href="#/activity"
        :aria-current="page === 'activity' ? 'page' : undefined"
        @click.prevent="emit('navigate', 'activity')"
        ><ControlIcon name="activity" /><span>{{ activityCopy.title }}</span></a
      >
      <a
        href="#/settings"
        class="navigation-settings"
        :aria-current="page === 'settings' || page === 'preferences' ? 'page' : undefined"
        @click.prevent="emit('navigate', 'settings')"
        ><ControlIcon name="settings" /><span>{{ copy.settings }}</span></a
      >
    </div>
  </nav>
</template>
