<script setup lang="ts">
import type { ChainStats } from "~/composables/useChain";
import { isAddress, shortAddress } from "~/utils/address";

definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();
const stats = ref<ChainStats | null>(null);
const error = ref("");
const search = ref("");
const searchError = ref("");

const account = computed(() => chain.getAccount());
const { getFriendlyName } = useAddressBook();

const hasFriendlyName = computed(() => {
  const address = account.value;
  return address ? Boolean(getFriendlyName(address)) : false;
});

onMounted(async () => {
  if (!chain.isConnected()) { router.push("/welcome"); return; }
  try { stats.value = await chain.getStats(); }
  catch (e: any) { error.value = e.message ?? "获取数据失败"; }
});

async function goSearch() {
  const value = search.value.trim();
  searchError.value = "";

  if (!value) {
    searchError.value = "请输入 Token ID 或账户地址。";
    return;
  }

  if (/^\d+$/.test(value)) {
    router.push(`/credentials/${value}`);
    return;
  }

  if (isAddress(value)) {
    router.push(`/accounts/${value}`);
    return;
  }

  searchError.value = "请输入正确的 Token ID 或 0x 开头的账户地址。";
}
</script>

<template>
  <div class="space-y-8 pt-2">
    <section v-if="account && stats" class="flat-surface-strong space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-3 min-w-0">
          <EditableAccountName :address="account" :kyc-verified="stats.kycVerified" />
          <div class="space-y-1">
            <p class="page-subtitle break-all">{{ account }}</p>
            <p class="helper-text">
              当前声誉 {{ stats.reputation }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <NuxtLink to="/mint" class="primary-pill">
            <span class="material-symbols-outlined text-lg" aria-hidden="true">add_circle</span>
            铸造证书
          </NuxtLink>
          <NuxtLink :to="`/accounts/${account}`" class="secondary-pill">
            <span class="material-symbols-outlined text-lg" aria-hidden="true">person</span>
            查看账户
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
        <p class="text-[2.5rem] leading-none font-semibold text-on-surface">
          {{ stats.credentialCount }}
        </p>
        <div class="pb-1">
          <p class="body-strong">{{ stats.credentialCount === 1 ? "张证书" : "张证书" }}</p>
          <p class="helper-text">{{ hasFriendlyName ? "这是你当前钱包名下的证书数量" : `当前钱包 ${shortAddress(account)} 持有的证书数量` }}</p>
        </div>
      </div>
    </section>

    <SectionBlock
      title="查找证书或账户"
      subtitle="输入 Token ID 直接查看证书，输入账户地址查看账户详情。"
    >
      <form class="search-shell" @submit.prevent="goSearch">
        <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">search</span>
        <input
          v-model="search"
          class="search-input"
          placeholder="输入 Token ID 或 0x 开头的账户地址"
        />
        <button type="submit" class="icon-button tonal-button" aria-label="搜索">
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </form>
      <p v-if="searchError" class="helper-text text-error">{{ searchError }}</p>
    </SectionBlock>

    <div v-if="error" class="text-sm text-error flex items-center gap-2">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      {{ error }}
    </div>
  </div>
</template>
