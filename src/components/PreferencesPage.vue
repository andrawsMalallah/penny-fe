<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { copy } from '../lib/copy'
import PreferenceControls from './PreferenceControls.vue'
import BackButton from './BackButton.vue'
const emit = defineEmits<{ back: [] }>()
const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <section class="settings-page" aria-labelledby="preferences-title">
    <BackButton :label="copy.backToSettings" @click="emit('back')" />
    <div class="settings-heading">
      <h1 id="preferences-title" ref="heading" tabindex="-1">{{ copy.languageAppearance }}</h1>
      <p>{{ copy.browserPreferences }}</p>
    </div>
    <div class="settings-section"><PreferenceControls /></div>
  </section>
</template>
