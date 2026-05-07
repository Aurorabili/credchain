<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";

definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();
const credentials = ref<ChainCredential[]>([]);
const loading = ref(true);
const errorMsg = ref("");

onMounted(async () => {
  // Guard
  if (!chain.isConnected()) { router.push("/welcome"); return; }
  await load();
});

async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    credentials.value = await chain.getCredentials();
  } catch (e: any) {
    errorMsg.value = e.message ?? "获取凭证列表失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 pt-2">
    <PageHeader title="凭证列表" />

    <div v-if="loading" class="text-center py-16 text-on-surface-variant">
      <span class="material-symbols-outlined text-5xl mb-3 block animate-spin" aria-hidden="true">refresh</span>
      <p>加载中…</p>
    </div>

    <div v-else-if="errorMsg" class="text-sm text-error flex items-center gap-2">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      {{ errorMsg }}
    </div>

    <div v-else-if="credentials.length === 0" class="text-center py-16 text-sm text-on-surface-variant space-y-3">
      <span class="material-symbols-outlined text-6xl block" aria-hidden="true">folder_open</span>
      <p>暂无凭证</p>
      <NuxtLink to="/mint" class="text-primary inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">add_circle</span>
        铸造第一个凭证
      </NuxtLink>
    </div>

    <div v-else class="divide-y divide-outline-variant">
      <CredentialRow v-for="c in credentials" :key="c.tokenId" :credential="c" />
    </div>
  </div>
</template>
