<script setup lang="ts">
import { useWallet } from "~/composables/useWallet";

const router = useRouter();
const { address } = useWallet();
const { tokensOfOwner, credentialMeta, verifyByTokenId, tokenIdOfCredential } = useCredentialContract();
const { statusKey, statusLabel, credentialTypeLabel } = useCredentialUi();

const busy = ref(false);
const search = ref("");
const items = ref<Array<{
  tokenId: number;
  credentialId: string;
  fileCount: number;
  revoked: boolean;
  expired: boolean;
  trusted: boolean;
  credentialType: number;
}>>([]);
const errorMsg = ref("");

async function loadOwned() {
  if (!address.value) return;

  busy.value = true;
  errorMsg.value = "";
  try {
    const tokenIds = (await tokensOfOwner(address.value)) as bigint[];
    const mapped = await Promise.all(
      tokenIds.map(async (id) => {
        const tokenId = Number(id);
        const [meta, verify] = await Promise.all([
          credentialMeta(tokenId),
          verifyByTokenId(tokenId)
        ]);
        return {
          tokenId,
          credentialId: String(meta.credentialId),
          fileCount: Number(meta.fileCount),
          revoked: Boolean(verify.revoked),
          expired: Boolean(verify.expired),
          trusted: Boolean(verify.trusted),
          credentialType: Number(verify.credentialType)
        };
      })
    );
    items.value = mapped.sort((a, b) => b.tokenId - a.tokenId);
  } catch (error: any) {
    errorMsg.value = error.message || "加载失败";
  } finally {
    busy.value = false;
  }
}

async function searchGo() {
  if (!search.value.trim()) return;

  errorMsg.value = "";
  const query = search.value.trim();
  if (/^\d+$/.test(query)) {
    await router.push(`/nft/${query}`);
    return;
  }

  try {
    const tokenId = await tokenIdOfCredential(query);
    if (Number(tokenId) > 0) {
      await router.push(`/nft/${Number(tokenId)}`);
      return;
    }
  } catch {
    // no-op
  }
  errorMsg.value = "未找到相关的 Token ID 或 Credential ID。";
}

onMounted(() => {
  if (address.value) loadOwned();
});

watch(address, (newAddr) => {
  if (newAddr) loadOwned();
});
</script>

<template>
  <section class="md3-section-shell">
    <SectionHeader
      eyebrow="My Credentials"
      title="浏览凭证"
      description="普通凭证与机构鉴权 SBT 会统一展示，并明确区分自签名与受信任状态。"
      icon="travel_explore"
    />

    <FeedbackBanner v-if="errorMsg" tone="error" :message="errorMsg" />

    <SurfaceCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-on-surface">搜索与钱包摘要</p>
            <p class="mt-1 text-sm text-on-surface-variant">支持直接输入数字 Token ID 或完整 Credential ID。</p>
          </div>
          <IconButton icon="refresh" label="刷新列表" tone="outlined" :disabled="busy" @click="loadOwned" />
        </div>

        <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Owner Wallet</p>
          <div class="mt-3">
            <AddressCopy v-if="address" :address="address" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <input
            v-model="search"
            class="md3-text-field"
            placeholder="输入 Token ID 或 Credential ID"
            @keydown.enter="searchGo"
          />
          <IconButton icon="arrow_forward" label="执行搜索" tone="filled" fill @click="searchGo" />
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard tone="soft">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-on-surface">我的凭证</p>
            <p class="mt-1 text-sm text-on-surface-variant">共 {{ items.length }} 项，按最新 Token ID 排序展示。</p>
          </div>
          <StatusChip status="neutral" :label="busy ? '加载中' : '已同步'" />
        </div>

        <div v-if="busy && !items.length" class="rounded-md3-lg bg-surface-container-high px-6 py-10 text-center">
          <span class="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
          <p class="mt-3 text-sm text-on-surface-variant">正在从链上同步你的凭证列表...</p>
        </div>

        <div v-else-if="!items.length">
          <EmptyState
            icon="inventory_2"
            title="还没有持有任何凭证"
            description="完成一次铸造后，这里会展示当前钱包名下的普通凭证或机构鉴权 SBT。"
          />
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="item in items"
            :key="item.tokenId"
            type="button"
            class="w-full rounded-md3-lg border border-outline-variant bg-surface-container-lowest p-4 text-left shadow-md3-1 transition duration-150 hover:bg-surface-container"
            @click="router.push(`/nft/${item.tokenId}`)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-on-surface">NFT #{{ item.tokenId }}</p>
                <p class="mt-1 truncate text-sm text-on-surface-variant">{{ item.credentialId }}</p>
              </div>
              <StatusChip :status="statusKey(item)" :label="statusLabel(item)" />
            </div>

            <div class="mt-4 flex items-center justify-between">
              <span class="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {{ credentialTypeLabel(item) }}
              </span>
              <span class="text-sm text-on-surface-variant">{{ item.fileCount }} 个附件</span>
            </div>
          </button>
        </div>
      </div>
    </SurfaceCard>
  </section>
</template>
