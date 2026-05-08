<script setup lang="ts">
import type { ChainAccountProfile } from "~/composables/useChain";
import { isAddress, shortAddress } from "~/utils/address";

definePageMeta({ layout: "default" });

const route = useRoute();
const router = useRouter();
const chain = useChain();

const address = computed(() => route.params.address as string);
const profile = ref<ChainAccountProfile | null>(null);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  if (!chain.isConnected()) {
    router.push("/welcome");
    return;
  }

  if (!isAddress(address.value)) {
    error.value = "账户地址格式不正确。";
    loading.value = false;
    return;
  }

  try {
    profile.value = await chain.getAccountProfile(address.value);
  } catch (e: any) {
    error.value = e?.message ?? "获取账户信息失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-8 pb-12">
    <PageHeader
      title="账户详情"
      :subtitle="isAddress(address) ? shortAddress(address) : address"
      back-to="/"
    />

    <div v-if="loading" class="flat-surface text-center py-16 text-on-surface-variant">
      <span class="material-symbols-outlined text-5xl mb-3 block animate-spin" aria-hidden="true">refresh</span>
      <p>正在读取账户信息…</p>
    </div>

    <div v-else-if="error" class="helper-text text-error flex items-center gap-2">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      {{ error }}
    </div>

    <template v-else-if="profile">
      <section class="flat-surface-strong space-y-4">
        <EditableAccountName :address="profile.address" :kyc-verified="profile.kycVerified" />
        <p class="page-subtitle break-all">{{ profile.address }}</p>
        <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
          <p class="text-[2.25rem] leading-none font-semibold text-on-surface">{{ profile.credentialCount }}</p>
          <div class="pb-1">
            <p class="body-strong">张证书</p>
            <p class="helper-text">当前声誉 {{ profile.reputation }}</p>
          </div>
        </div>
      </section>

      <SectionBlock title="账户持有的证书" subtitle="按当前展示信誉排序。">
        <div v-if="profile.credentials.length" class="flat-list">
          <CredentialRow v-for="credential in profile.credentials" :key="credential.tokenId" :credential="credential" />
        </div>
        <div v-else class="flat-surface helper-text">
          这个账户目前还没有证书。
        </div>
      </SectionBlock>
    </template>
  </div>
</template>
