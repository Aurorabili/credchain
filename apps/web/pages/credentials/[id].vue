<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";
import { shortAddress } from "~/utils/address";

definePageMeta({ layout: "default" });

const route = useRoute();
const chain = useChain();
const id = computed(() => Number(route.params.id));
const credential = ref<ChainCredential | null>(null);
const loading = ref(true);
const error = ref("");
const { getDisplayName } = useAddressBook();

const shortOwner = computed(() => {
  const owner = credential.value?.owner;
  if (!owner) return "";
  return shortAddress(owner);
});

const starText = computed(() => {
  const stars = credential.value?.displayStars;
  return stars == null ? "" : `${stars.toFixed(1)} / 5.0`;
});

const ownerName = computed(() => {
  const owner = credential.value?.owner;
  return owner ? getDisplayName(owner) : "";
});

const summaryDescription = computed(() => {
  const item = credential.value;
  if (!item) return "";
  if (item.isRevoked) return "这张证书已撤销";
  return `目前已有 ${item.voteCount} 人参与评价`;
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
  <div v-else-if="credential" class="space-y-8 pb-20">
    <PageHeader :title="credential.name" back-to="/credentials" />

    <section class="flat-surface-strong space-y-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-3 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container">
              证书
            </span>
            <span class="inline-flex items-center rounded-full bg-tertiary-container px-3 py-1 text-xs font-medium text-on-tertiary-container">
              {{ credential.businessType }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              :class="credential.isRevoked ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'"
            >
              {{ credential.isRevoked ? "已撤销" : "有效" }}
            </span>
          </div>
          <p class="text-sm leading-6 text-on-surface-variant">{{ credential.description }}</p>
        </div>

        <div class="sm:min-w-[240px] sm:text-right sm:justify-self-end">
          <p class="text-base font-medium text-on-surface">{{ credential.displayLabel }}</p>
          <p class="helper-text mt-1">{{ summaryDescription }}</p>
        </div>
      </div>

      <div v-if="credential.image" class="overflow-hidden rounded-[24px] bg-surface">
        <img :src="credential.image" :alt="credential.name" class="w-full max-h-80 object-cover" />
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-outline-variant/70 pt-3">
        <template v-if="credential.isRevoked">
          <span class="helper-text text-error inline-flex items-center gap-2">
            <span class="material-symbols-outlined" aria-hidden="true">block</span>
            这张证书已撤销，不能继续投票。
          </span>
        </template>
        <template v-else-if="credential.hasCurrentUserVoted">
          <span class="helper-text text-primary inline-flex items-center gap-2">
            <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
            你已经投过票，之后不能修改。
          </span>
        </template>
        <template v-else>
          <p class="helper-text mr-1">提交后不能修改，也不能再次投票。</p>
          <VoteButton :token-id="credential.tokenId" @voted="onVoted" />
        </template>
      </div>
    </section>

    <SectionBlock title="基本信息">
      <div class="info-list">
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">证书编号</p>
          </div>
          <p class="info-value">#{{ credential.tokenId }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">持有人</p>
          </div>
          <NuxtLink :to="`/accounts/${credential.owner}`" class="flex min-w-0 items-center justify-end text-right">
            <p class="info-value">{{ ownerName }}</p>
            <span class="material-symbols-outlined info-action" aria-hidden="true">chevron_right</span>
          </NuxtLink>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">签发方</p>
          </div>
          <p class="info-value">{{ credential.issuerName }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">签发时间</p>
          </div>
          <p class="info-value">{{ credential.issuedAt || "未提供" }}</p>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="凭证详情">
      <div class="info-list">
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">业务类型</p>
          </div>
          <p class="info-value">{{ credential.businessType }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">元数据 CID</p>
          </div>
          <p class="info-value">{{ credential.metadataCID }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">元数据地址</p>
          </div>
          <a
            v-if="credential.metadataUrl"
            :href="credential.metadataUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-w-0 items-center justify-end text-right"
          >
            <span class="info-value text-primary hover:underline">{{ credential.tokenUri || credential.metadataUrl }}</span>
            <span class="material-symbols-outlined info-action" aria-hidden="true">chevron_right</span>
          </a>
          <p v-else class="info-value">{{ credential.tokenUri || "未提供" }}</p>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock
      title="评价情况"
    >
      <div class="info-list">
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">当前评价</p>
          </div>
          <p class="info-value">{{ credential.displayLabel }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">评价状态</p>
          </div>
          <p class="info-value">{{ starText }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">参与人数</p>
          </div>
          <p class="info-value">{{ credential.voteCount }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">持有人当前声誉</p>
          </div>
          <p class="info-value">{{ credential.ownerReputation }}</p>
        </div>
        <div class="info-row">
          <div class="info-cell">
            <p class="info-label">链上评分</p>
          </div>
          <p class="info-value">{{ credential.score }}</p>
        </div>
      </div>
      <p class="helper-text px-1">通过链上共识对评价该凭证的可信度。</p>
    </SectionBlock>

    <SectionBlock v-if="credential.businessFields.length" title="业务字段">
      <div class="info-list">
        <div
          v-for="field in credential.businessFields"
          :key="`${field.name}:${field.value}`"
          class="info-row"
        >
          <div class="info-cell">
            <p class="info-label">{{ field.name }}</p>
          </div>
          <p class="info-value">{{ field.value }}</p>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock v-if="credential.evidence.length" title="佐证材料">
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="item in credential.evidence"
          :key="item.cid"
          class="flat-surface space-y-3"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="body-strong break-all">{{ item.name }}</p>
              <p class="mt-1 helper-text">{{ item.mimeType }}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
              {{ item.kind === "image" ? "image" : item.kind === "document" ? "description" : "attach_file" }}
            </span>
          </div>

          <img
            v-if="item.kind === 'image'"
            :src="item.url"
            :alt="item.name"
            class="w-full h-44 rounded-2xl object-cover"
          />

          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <span class="material-symbols-outlined text-base" aria-hidden="true">open_in_new</span>
            打开材料
          </a>
        </div>
      </div>
    </SectionBlock>
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
