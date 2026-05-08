<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";

definePageMeta({ layout: "default" });

const route = useRoute();
const chain = useChain();
const id = computed(() => Number(route.params.id));
const credential = ref<ChainCredential | null>(null);
const loading = ref(true);
const error = ref("");

const typeLabel = computed(() => {
  const value = credential.value?.credentialType;
  const labels: Record<string, string> = {
    degree: "学位",
    certificate: "证书",
    badge: "徽章",
    license: "执照",
  };
  return value ? (labels[value] ?? value) : "";
});

const typeIcon = computed(() => {
  const value = credential.value?.credentialType;
  if (value === "degree") return "school";
  if (value === "certificate") return "verified";
  if (value === "badge") return "military_tech";
  if (value === "license") return "workspace_premium";
  return "id_card";
});

const shortOwner = computed(() => {
  const owner = credential.value?.owner;
  if (!owner) return "";
  return `${owner.slice(0, 6)}...${owner.slice(-4)}`;
});

const starText = computed(() => {
  const stars = credential.value?.displayStars;
  return stars == null ? "" : `${stars.toFixed(1)} / 5.0`;
});

onMounted(async () => {
  try {
    credential.value = await chain.getCredential(id.value);
  } catch (e: any) {
    error.value = e.message ?? "获取凭证失败";
  } finally {
    loading.value = false;
  }
});

async function onVoted() {
  credential.value = await chain.getCredential(id.value);
}
</script>

<template>
  <div v-if="loading" class="text-center py-16 text-on-surface-variant">
    <span class="material-symbols-outlined text-5xl mb-3 block animate-spin" aria-hidden="true">refresh</span>
    <p>正在读取凭证详情…</p>
  </div>
  <div v-else-if="credential" class="space-y-6 pb-20">
    <PageHeader :title="credential.name" back-to="/credentials" />

    <section class="rounded-[28px] bg-surface-container p-5 sm:p-6">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-3xl" aria-hidden="true">{{ typeIcon }}</span>
          </div>
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container">
                {{ typeLabel }}
              </span>
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                :class="credential.isRevoked ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'"
              >
                {{ credential.isRevoked ? "已撤销" : "有效" }}
              </span>
              <span
                class="inline-flex items-center rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant"
              >
                {{ credential.isLocked ? "SBT / 不可转让" : "可转让" }}
              </span>
            </div>
            <p class="text-sm text-on-surface-variant">{{ credential.description }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:min-w-[280px]">
          <div class="rounded-3xl bg-surface-container-high px-4 py-3">
            <p class="text-xs text-on-surface-variant">展示信誉</p>
            <p class="text-xl font-semibold mt-1">{{ credential.displayScore.toFixed(1) }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">{{ credential.displayLabel }} · {{ starText }}</p>
          </div>
          <div class="rounded-3xl bg-surface-container-high px-4 py-3">
            <p class="text-xs text-on-surface-variant">持有人声誉</p>
            <p class="text-xl font-semibold mt-1">{{ credential.ownerReputation }}</p>
          </div>
          <div class="rounded-3xl bg-surface-container-high px-4 py-3">
            <p class="text-xs text-on-surface-variant">参与投票人数</p>
            <p class="text-xl font-semibold mt-1">{{ credential.voteCount }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">贝叶斯平滑已启用</p>
          </div>
          <div class="rounded-3xl bg-surface-container-high px-4 py-3">
            <p class="text-xs text-on-surface-variant">群体内部加权均值</p>
            <p class="text-xl font-semibold mt-1">{{ credential.baseDisplayScore.toFixed(1) }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">未平滑展示基数</p>
          </div>
        </div>
      </div>

      <div v-if="credential.image" class="mt-5 overflow-hidden rounded-[24px] border border-outline-variant bg-surface">
        <img :src="credential.image" :alt="credential.name" class="w-full max-h-80 object-cover" />
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4">
        <p class="text-xs text-on-surface-variant">原始链上分数</p>
        <p class="mt-1 font-medium">{{ credential.score }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4">
        <p class="text-xs text-on-surface-variant">累计投票权重</p>
        <p class="mt-1 font-medium">{{ credential.weightSum }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4 sm:col-span-2">
        <p class="text-xs text-on-surface-variant">未截断加权投票和</p>
        <p class="mt-1 text-sm break-all">{{ credential.rawVoteSum }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4">
        <p class="text-xs text-on-surface-variant">Token ID</p>
        <p class="mt-1 font-medium">#{{ credential.tokenId }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4">
        <p class="text-xs text-on-surface-variant">持有人</p>
        <p class="mt-1 font-medium break-all">{{ shortOwner }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4 sm:col-span-2">
        <p class="text-xs text-on-surface-variant">链上地址</p>
        <p class="mt-1 text-sm break-all">{{ credential.owner }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4 sm:col-span-2">
        <p class="text-xs text-on-surface-variant">Metadata CID</p>
        <p class="mt-1 text-sm break-all">{{ credential.metadataHash }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4 sm:col-span-2">
        <p class="text-xs text-on-surface-variant">Token URI</p>
        <a
          v-if="credential.metadataUrl"
          :href="credential.metadataUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 block text-sm break-all text-primary hover:underline"
        >
          {{ credential.tokenUri || credential.metadataUrl }}
        </a>
        <p v-else class="mt-1 text-sm break-all">{{ credential.tokenUri || "未提供" }}</p>
      </div>
      <div class="rounded-[24px] border border-outline-variant bg-surface px-4 py-4 sm:col-span-2" v-if="credential.issuedAt">
        <p class="text-xs text-on-surface-variant">签发时间</p>
        <p class="mt-1 text-sm">{{ credential.issuedAt }}</p>
      </div>
    </section>

    <section v-if="credential.attributes.length" class="rounded-[24px] border border-outline-variant bg-surface p-4">
      <h2 class="text-sm font-semibold">凭证属性</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          v-for="attribute in credential.attributes"
          :key="`${attribute.label}:${attribute.value}`"
          class="rounded-2xl bg-surface-container px-4 py-3"
        >
          <p class="text-xs text-on-surface-variant">{{ attribute.label }}</p>
          <p class="mt-1 text-sm font-medium break-words">{{ attribute.value }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-[24px] border border-outline-variant bg-surface p-4">
      <h2 class="text-sm font-semibold">链上操作</h2>
      <div v-if="credential.isRevoked" class="mt-3 flex items-center gap-2 text-error text-sm">
        <span class="material-symbols-outlined" aria-hidden="true">block</span>
        该凭证已被撤销，不能继续投票。
      </div>
      <div v-else-if="credential.hasCurrentUserVoted" class="mt-3 flex items-center gap-2 text-primary text-sm">
        <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
        你已经为这张凭证投过票了。当前版本每个地址对同一凭证只统计一次有效投票。
      </div>
      <div v-else class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-on-surface-variant">
          你的投票会影响该凭证的链上原始分数、展示信誉分，并更新持有者声誉。
        </div>
        <VoteButton :token-id="credential.tokenId" @voted="onVoted" />
      </div>
    </section>
  </div>
  <div v-else-if="error" class="text-center text-on-surface-variant py-16">
    <span class="material-symbols-outlined text-6xl mb-4 block" aria-hidden="true">error</span>
    <p>{{ error }}</p>
    <NuxtLink to="/" class="text-primary text-sm mt-2 inline-block">返回仪表盘</NuxtLink>
  </div>
  <div v-else class="text-center text-on-surface-variant py-16">
    <span class="material-symbols-outlined text-6xl mb-4 block" aria-hidden="true">search_off</span>
    <p>凭证未找到</p>
    <NuxtLink to="/credentials" class="text-primary text-sm mt-2 inline-block">返回凭证列表</NuxtLink>
  </div>
</template>
