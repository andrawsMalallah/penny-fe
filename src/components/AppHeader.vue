<script setup lang="ts">
import { copy } from '../lib/copy'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { User } from '../lib/api'
import ControlIcon from './ControlIcon.vue'

defineProps<{ user: User | null; busy: boolean }>()
const emit = defineEmits<{ settings: []; logout: []; home: [] }>()
const open = ref(false)
const container = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
async function close(restoreFocus = false): Promise<void> {
  open.value = false
  if (restoreFocus) {
    await nextTick()
    trigger.value?.focus()
  }
}
function outside(event: Event): void {
  const target = event instanceof FocusEvent ? event.relatedTarget : event.target
  if (!container.value?.contains(target as Node | null)) void close()
}
function choose(action: 'settings' | 'logout'): void {
  void close()
  if (action === 'settings') emit('settings')
  else emit('logout')
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <header class="site-header">
    <a class="brand" href="#/" aria-label="Penny" @click="emit('home')">
      <img src="/logo.svg" width="34" height="34" alt="" /><span>Penny</span>
    </a>
    <div
      v-if="user"
      ref="container"
      class="user-dropdown"
      @keydown.esc.stop.prevent="close(true)"
      @focusout="outside"
    >
      <button
        ref="trigger"
        class="user-menu-trigger"
        type="button"
        :aria-expanded="open"
        :aria-label="`${copy.accountMenu}: ${user.display_name}`"
        :title="user.display_name"
        aria-controls="user-actions"
        :disabled="busy"
        @click="open = !open"
      >
        <span class="user-avatar" aria-hidden="true">{{
          Array.from(user.display_name.trim())[0]
        }}</span>
      </button>
      <div v-if="open" id="user-actions" class="user-menu">
        <a href="#/settings" @click="choose('settings')"
          ><ControlIcon name="settings" />{{ copy.settings }}</a
        >
        <div class="user-menu-divider" aria-hidden="true"></div>
        <button class="user-menu-logout" type="button" :disabled="busy" @click="choose('logout')">
          <ControlIcon name="logout" />{{ copy.logout }}
        </button>
      </div>
    </div>
  </header>
</template>
