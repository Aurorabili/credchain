<script setup lang="ts">
import { useWallet } from '~/composables/useWallet';

const { login } = useWallet();
const busy = ref(false);

async function handleLogin() {
  busy.value = true;
  await login();
  busy.value = false;
}
</script>

<template>
  <div class="flex min-h-[85vh] flex-col items-center justify-center p-6 text-center">
    <div class="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-300">
      <span class="material-symbols-outlined text-[3rem]">verified</span>
    </div>
    
    <h1 class="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
      CredChain
    </h1>
    <p class="mb-12 text-slate-500 dark:text-slate-400">
      去中心化凭证发放与验证平台
    </p>

    <button
      :disabled="busy"
      class="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-base font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-slate-900"
      @click="handleLogin"
    >
      <span v-if="busy" class="material-symbols-outlined animate-spin">sync</span>
      <span v-else class="material-symbols-outlined">account_balance_wallet</span>
      {{ busy ? '连接中...' : '连接钱包' }}
    </button>
  </div>
</template>
