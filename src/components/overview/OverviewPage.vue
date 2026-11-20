<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { ApiError, apiRequest, type User } from '../../lib/api'
import { formatMoney, getAccountPage, type MoneyAccount, type RecordPage } from '../../lib/accounts'
import { designCopy as text } from '../../lib/designCopy'
import { accountCopy } from '../../lib/accountCopy'
import { copy } from '../../lib/copy'
import ControlIcon from '../ui/ControlIcon.vue'
defineProps<{ user: User }>()
const emit = defineEmits<{ accounts: []; settings: []; expired: [] }>()
const records = ref<RecordPage<MoneyAccount> | null>(null)
const loading = ref(false)
const failed = ref(false)
const heading = ref<HTMLElement | null>(null)
async function load(): Promise<void> {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    records.value = await getAccountPage<MoneyAccount>('accounts')
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 403) {
      try {
        await apiRequest('auth/me/')
      } catch (check) {
        if (check instanceof ApiError && check.status === 403) {
          emit('expired')
          return
        }
      }
    }
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await nextTick()
  heading.value?.focus()
  await load()
})
</script>
<template>
  <section class="overview-page" :aria-busy="loading">
    <div class="page-heading">
      <h1 ref="heading" tabindex="-1">{{ text.greeting.replace('{name}', user.display_name) }}</h1>
      <p>{{ text.overviewHelp }}</p>
    </div>
    <p v-if="loading" role="status">{{ text.loading }}</p>
    <div v-if="failed" class="error-summary" role="alert">
      {{ text.loadError }}
      <button type="button" class="text-button" @click="load">{{ copy.retry }}</button>
    </div>
    <div class="overview-grid">
      <section class="surface-panel overview-accounts" aria-labelledby="overview-accounts-title">
        <div class="panel-heading">
          <div>
            <h2 id="overview-accounts-title">{{ text.accountPreview }}</h2>
            <p v-if="records">{{ text.accountCount.replace('{count}', String(records.count)) }}</p>
          </div>
          <button class="secondary-button" type="button" @click="emit('accounts')">
            <ControlIcon name="wallet" />{{ accountCopy.accounts }}
          </button>
        </div>
        <div v-if="records && !records.count" class="overview-empty">
          <ControlIcon name="wallet" />
          <h3>{{ text.noAccounts }}</h3>
          <p>{{ text.noAccountsHelp }}</p>
        </div>
        <ul v-else-if="records" class="overview-account-list">
          <li v-for="account in records.results.slice(0, 4)" :key="account.id">
            <span class="feature-icon"><ControlIcon name="wallet" /></span>
            <div class="overview-account-name">
              <strong>{{ account.name }}</strong><span>{{
                account.group_name || accountCopy.ungrouped
              }}</span>
            </div>
            <dl>
              <div>
                <dt class="currency-badge currency-iqd">IQD</dt>
                <dd dir="ltr">{{ formatMoney(account.balance_iqd) }}</dd>
              </div>
              <div>
                <dt class="currency-badge currency-usd">USD</dt>
                <dd dir="ltr">{{ formatMoney(account.balance_usd) }}</dd>
              </div>
            </dl>
          </li>
        </ul>
        <button v-if="records?.count" type="button" class="text-button" @click="emit('accounts')">
          {{ text.viewAccounts }}
        </button>
        <p class="field-help">{{ text.overviewNote }}</p>
      </section>
      <section class="surface-panel overview-preferences">
        <span class="feature-icon"><ControlIcon name="settings" /></span>
        <h2>{{ text.themeReady }}</h2>
        <bdi class="overview-email">{{ user.email }}</bdi>
        <p>{{ text.generalHelp }}</p>
        <button type="button" class="secondary-button" @click="emit('settings')">
          {{ text.accountSettings }}
        </button>
      </section>
    </div>
  </section>
</template>
