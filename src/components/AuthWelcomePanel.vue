<script setup lang="ts">
import type { User } from '../lib/api'
import { copy } from '../lib/copy'
import PrimaryButton from './PrimaryButton.vue'

defineProps<{ user: User | null; busy: boolean }>()
defineEmits<{ logout: []; sessions: []; security: [] }>()
</script>

<template>
  <div class="welcome-panel">
    <div class="verified-identity">
      <span class="verified-mark" aria-hidden="true">✓</span>
      <div>
        <strong>{{ user?.display_name }}</strong><bdi>{{ user?.email }}</bdi>
      </div>
    </div>
    <p>{{ copy.foundationNote }}</p>
    <button
      class="text-button welcome-sessions"
      type="button"
      :disabled="busy"
      @click="$emit('security')"
    >
      {{ copy.factorTitle }}
    </button>
    <button
      class="text-button welcome-sessions"
      type="button"
      :disabled="busy"
      @click="$emit('sessions')"
    >
      {{ copy.sessionsTitle }}
    </button>
    <PrimaryButton type="button" :busy="busy" @click="$emit('logout')">{{
      copy.logout
    }}</PrimaryButton>
  </div>
</template>

<style scoped>
.welcome-sessions {
  display: block;
  margin-bottom: 16px;
}
</style>
