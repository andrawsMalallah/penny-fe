<script setup lang="ts">
import type { User } from '../lib/api'
import { copy } from '../lib/copy'

defineProps<{ user: User }>()
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
  </div>
</template>
