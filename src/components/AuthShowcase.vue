<script setup lang="ts">
import { copy } from '../lib/copy'
</script>
<template>
  <section class="auth-intro" aria-labelledby="intro-title">
    <p class="intro-label">{{ copy.introLabel }}</p>
    <h1 id="intro-title">{{ copy.introTitle }}</h1>
    <p class="intro-description">{{ copy.introBody }}</p>
    <div class="example-ledger">
      <div class="ledger-heading">
        <span>{{ copy.moneyView }}</span><span>{{ copy.example }}</span>
      </div>
      <div class="ledger-balance">
        <span class="currency-badge currency-iqd">IQD</span
        ><strong dir="ltr">2,450,000<span>.00</span></strong
        ><span>{{ copy.accounts.replace('{count}', '3') }}</span>
      </div>
      <div class="ledger-balance">
        <span class="currency-badge currency-usd">USD</span
        ><strong dir="ltr">1,250<span>.00</span></strong
        ><span>{{ copy.accounts.replace('{count}', '3') }}</span>
      </div>
      <div class="ledger-footer">
        <span>{{ copy.everyday }}</span><span>{{ copy.savings }}</span
        ><span>{{ copy.goals }}</span>
      </div>
    </div>
    <p class="intro-foot">{{ copy.moneyHint }}</p>
  </section>
</template>
