<script setup lang="ts">
defineProps<{
  name:
    | 'chevron'
    | 'back'
    | 'refresh'
    | 'settings'
    | 'logout'
    | 'home'
    | 'wallet'
    | 'shield'
    | 'devices'
    | 'eye'
    | 'eyeOff'
    | 'category'
    | 'activity'
    | 'income'
    | 'expense'
    | 'transfer'
    | 'exchange'
    | 'debt_in'
    | 'debt_out'
    | 'debts'
    | 'analytics'
}>()

const paths = {
  analytics: ['M4 3v18h17', 'M8 16v-5', 'M13 16V7', 'M18 16V4'],
  debts: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21v-2a8 8 0 0 1 16 0v2', 'M9 17h6'],
  debt_in: ['M12 19V5', 'm6 11 6-6 6 6'],
  debt_out: ['M12 5v14', 'm6 13 6 6 6-6'],
  exchange: ['M4 7h16', 'm16 3 4 4-4 4', 'M20 17H4', 'm8 13-4 4 4 4'],
  transfer: ['M4 7h16', 'm16 3 4 4-4 4', 'M20 17H4', 'm8 13-4 4 4 4'],
  activity: ['M4 3h16v18H4Z', 'M8 7h8', 'M8 12h8', 'M8 17h5'],
  income: ['M12 19V5', 'm6 11 6-6 6 6'],
  expense: ['M12 5v14', 'm6 13 6 6 6-6'],
  category: ['M3 3h7v7H3Z', 'M14 3h7v7h-7Z', 'M3 14h7v7H3Z', 'M14 14h7v7h-7Z'],
  home: ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-8h6v8'],
  wallet: ['M20 7H5a2 2 0 0 1 0-4h13v4', 'M5 7H3v14h18V7Z', 'M21 11h-6v6h6', 'M17 14h1'],
  shield: ['M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z', 'm8 12 3 3 5-6'],
  devices: ['M3 4h18v13H3Z', 'M8 21h8', 'M12 17v4'],
  eye: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  eyeOff: [
    'm3 3 18 18',
    'M10 5a12 12 0 0 1 2 0c7 0 10 7 10 7a18 18 0 0 1-4 5',
    'M6 6a19 19 0 0 0-4 6s3 7 10 7a12 12 0 0 0 5-1',
  ],
  chevron: ['m6 9 6 6 6-6'],
  back: ['m12 5-7 7 7 7', 'M5 12h14'],
  refresh: [
    'M21 3v5h-5',
    'M3 21v-5h5',
    'M3 12a9 9 0 0 1 15.364-6.364L21 8',
    'M21 12a9 9 0 0 1-15.364 6.364L3 16',
  ],
  settings: [
    'M15.25 12a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Z',
    'M9.13 5.07L10.06 4.76L9.92 2.22L14.08 2.22L13.94 4.76L14.87 5.07L15.75 5.50L17.45 3.61L20.39 6.55L18.50 8.25L18.93 9.13L19.24 10.06L21.78 9.92L21.78 14.08L19.24 13.94L18.93 14.87L18.50 15.75L20.39 17.45L17.45 20.39L15.75 18.50L14.87 18.93L13.94 19.24L14.08 21.78L9.92 21.78L10.06 19.24L9.13 18.93L8.25 18.50L6.55 20.39L3.61 17.45L5.50 15.75L5.07 14.87L4.76 13.94L2.22 14.08L2.22 9.92L4.76 10.06L5.07 9.13L5.50 8.25L3.61 6.55L6.55 3.61L8.25 5.50Z',
  ],
  logout: ['M9 4H5v16h4', 'M9 12h12', 'm17 8 4 4-4 4'],
}
</script>

<template>
  <svg
    class="control-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in paths[name]" :key="path" :d="path" />
  </svg>
</template>
