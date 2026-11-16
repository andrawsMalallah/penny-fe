<script setup lang="ts">
import type { User } from '../lib/api'
import { copy } from '../lib/copy'
import PrimaryButton from './PrimaryButton.vue'

defineProps<{ user: User | null; busy: boolean }>()
defineEmits<{ logout: [] }>()
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
    <PrimaryButton type="button" :busy="busy" @click="$emit('logout')">{{
      copy.logout
    }}</PrimaryButton>
  </div>
</template>
