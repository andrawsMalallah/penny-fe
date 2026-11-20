<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <p dir="ltr">@ Aether {{ currentYear }}</p>
    </div>
  </footer>
</template>
