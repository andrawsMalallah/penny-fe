<script setup lang="ts">
import { copy } from '../../lib/copy'
import AuthInput from './AuthInput.vue'
import PrimaryButton from '../ui/PrimaryButton.vue'

defineProps<{
  registering: boolean
  busy: boolean
  fieldError: (field: string) => string | undefined
}>()
defineEmits<{ submit: []; switch: []; reset: [] }>()
const displayName = defineModel<string>('displayName', { required: true })
const email = defineModel<string>('email', { required: true })
const password = defineModel<string>('password', { required: true })
</script>

<template>
  <form @submit.prevent="$emit('submit')">
    <AuthInput
      v-if="registering"
      id="name"
      v-model="displayName"
      :label="copy.name"
      :error="fieldError('display_name')"
      autocomplete="name"
      :maxlength="100"
      :placeholder="copy.namePlaceholder"
      :disabled="busy"
    />
    <AuthInput
      id="email"
      v-model="email"
      :label="copy.email"
      :error="fieldError('email')"
      type="email"
      direction="ltr"
      autocomplete="email"
      :maxlength="254"
      placeholder="you@example.com"
      :disabled="busy"
    />
    <AuthInput
      id="password"
      v-model="password"
      :label="copy.password"
      :help="registering ? copy.passwordHelp : undefined"
      :error="fieldError('password')"
      type="password"
      :autocomplete="registering ? 'new-password' : 'current-password'"
      :minlength="registering ? 12 : 1"
      :maxlength="256"
      :placeholder="registering ? copy.passwordPlaceholder : copy.loginPassword"
      :disabled="busy"
    />
    <PrimaryButton :busy="busy">{{
      registering ? (busy ? copy.creating : copy.create) : busy ? copy.signingIn : copy.signIn
    }}</PrimaryButton>
    <p v-if="registering" class="form-note">{{ copy.emailNote }}</p>
    <div v-else class="auth-links-row">
      <button class="text-button" type="button" :disabled="busy" @click="$emit('reset')">
        {{ copy.forgotPassword }}
      </button>
      <button class="text-button" type="button" :disabled="busy" @click="$emit('switch')">
        {{ copy.create }}
      </button>
    </div>
    <div v-if="registering" class="auth-switch">
      <span>{{ copy.haveAccount }}</span>
      <button class="text-button" type="button" :disabled="busy" @click="$emit('switch')">
        {{ copy.signIn }}
      </button>
    </div>
  </form>
</template>
