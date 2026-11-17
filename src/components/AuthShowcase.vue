<script setup lang="ts">
import { designCopy as text } from '../lib/designCopy'
import BrandWave from './BrandWave.vue'
</script>
<template>
  <section class="auth-intro" aria-labelledby="intro-title">
    <h1 id="intro-title">{{ text.tagline }}</h1>
    <p class="intro-description">{{ text.heroBody }}</p>
    <BrandWave />
  </section>
</template>
