<script setup lang="ts">
import type { ChainStats } from "~/composables/useChain";

definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();
const stats = ref<ChainStats | null>(null);
const error = ref("");

onMounted(async () => {
  if (!chain.isConnected()) { router.push("/welcome"); return; }
  try { stats.value = await chain.getStats(); }
  catch (e: any) { error.value = e.message ?? "获取数据失败"; }
});
</script>

<template>
  <div class="space-y-6 pt-2">
    <!-- Greeting -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-headline-sm font-semibold">仪表盘</h1>
        <p class="text-sm text-on-surface-variant mt-1">欢迎回来</p>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatItem icon="shield" label="声誉" :value="stats.reputation" :accent="true" />
      <StatItem icon="verified" label="凭证数" :value="stats.credentialCount" />
      <StatItem icon="how_to_vote" label="投票权重" :value="stats.votingWeight" />
    </div>

    <!-- Error -->
    <div v-if="error" class="text-sm text-error flex items-center gap-2">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      {{ error }}
    </div>

    <!-- KYC badge -->
    <div v-if="stats?.kycVerified" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
      <span class="material-symbols-outlined icon-filled" aria-hidden="true">verified</span>
      KYC 已验证
    </div>

    <!-- Quick actions -->
    <div class="flex flex-wrap gap-3">
      <NuxtLink
        to="/mint"
        class="inline-flex items-center gap-2 bg-primary text-on-primary rounded-md3-full px-4 py-2.5 text-sm font-medium hover:opacity-90 transition"
      >
        <span class="material-symbols-outlined text-lg" aria-hidden="true">add_circle</span>
      铸造新凭证
      </NuxtLink>
      <NuxtLink
        to="/credentials"
        class="inline-flex items-center gap-2 border border-outline text-on-surface rounded-md3-full px-4 py-2.5 text-sm font-medium hover:bg-surface-container-high transition"
      >
        <span class="material-symbols-outlined text-lg" aria-hidden="true">list</span>
        查看全部
      </NuxtLink>
    </div>

    <p v-if="!chain.isConnected()" class="text-sm text-on-surface-variant pt-4">
      连接钱包以查看链上数据。
    </p>
  </div>
</template>
