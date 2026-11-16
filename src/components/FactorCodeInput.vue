<script setup lang="ts">
import { watch } from 'vue'
import { copy } from '../lib/copy'
import AuthInput from './AuthInput.vue'

const code = defineModel<string>({ required: true })
const recovery = defineModel<boolean>('recovery', { default: false })
defineProps<{ id: string; busy: boolean; error?: string; allowRecovery?: boolean }>()
watch(recovery, () => {
  code.value = ''
})
</script>

<template>
  <AuthInput
    :id="id"
    v-model="code"
    :label="recovery ? copy.factorRecoveryCode : copy.factorCode"
    :help="recovery ? copy.factorRecoveryHelp : copy.factorCodeHelp"
    :error="error"
    :code="!recovery"
    direction="ltr"
    :autocomplete="recovery ? 'off' : 'one-time-code'"
    :minlength="recovery ? 16 : 6"
    :maxlength="recovery ? 32 : 6"
    :placeholder="recovery ? undefined : '000000'"
    :disabled="busy"
  />
  <button
    v-if="allowRecovery"
    class="text-button"
    type="button"
    :disabled="busy"
    @click="recovery = !recovery"
  >
    {{ recovery ? copy.factorUseApp : copy.factorUseRecovery }}
  </button>
</template>
